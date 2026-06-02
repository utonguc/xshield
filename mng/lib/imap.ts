import "server-only";
import { ImapFlow } from "imapflow";
import { query, queryOne } from "./db";

interface ParsedMail {
  uid: number;
  subject: string;
  from: string;
  fromName: string;
  body: string;
  messageId: string;
  inReplyTo: string;
  date: Date;
}

function extractTicketRef(subject: string): number | null {
  const m = subject.match(/\[Ticket #(\d+)\]/i);
  return m ? Number(m[1]) : null;
}

function parseAddressName(addr: string): { email: string; name: string } {
  const m = addr.match(/^"?([^"<]+?)"?\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: addr.trim().toLowerCase() };
}

export async function pollNewMail(): Promise<{ created: number; replies: number; errors: number }> {
  const cursor = await queryOne<{ last_uid: string }>("SELECT last_uid FROM imap_cursor WHERE id=1");
  const lastUid = Number(cursor?.last_uid ?? 0);

  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASS!,
    },
    logger: false,
  });

  let created = 0, replies = 0, errors = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    let maxUid = lastUid;

    try {
      const messages: ParsedMail[] = [];
      const searchRange = lastUid > 0 ? `${lastUid + 1}:*` : "1:*";

      for await (const msg of client.fetch(searchRange, {
        uid: true, envelope: true, bodyStructure: true, source: true,
      }, { uid: true })) {
        if (msg.uid <= lastUid) continue;
        if (msg.uid > maxUid) maxUid = msg.uid;

        const env = msg.envelope;
        if (!env) continue;
        const fromAddr = env.from?.[0];
        const addrPart = (fromAddr as { address?: string } | undefined)?.address ?? "";
        const namePart = (fromAddr as { name?: string } | undefined)?.name ?? "";
        const rawFrom = addrPart
          ? namePart ? `"${namePart}" <${addrPart}>` : addrPart
          : "";
        const { email: fromEmail, name: fromName } = parseAddressName(rawFrom || "");

        let body = "";
        try {
          const src = msg.source?.toString() ?? "";
          const textMatch = src.match(/Content-Type: text\/plain[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]+?)(?=\r?\n--|\r?\n\r?\nContent-Type|$)/i);
          body = textMatch?.[1]?.trim() ?? src.replace(/<[^>]+>/g, "").trim().slice(0, 5000);
        } catch { /* ignore parse errors */ }

        messages.push({
          uid: msg.uid,
          subject: env.subject || "(Konu Yok)",
          from: fromEmail,
          fromName: fromName || fromEmail,
          body,
          messageId: env.messageId || "",
          inReplyTo: (env as unknown as Record<string, string>).inReplyTo || "",
          date: env.date ?? new Date(),
        });
      }

      const processedUids: number[] = [];

      for (const mail of messages) {
        try {
          const ticketRef = extractTicketRef(mail.subject);
          if (ticketRef) {
            const exists = await queryOne("SELECT id FROM tickets WHERE id=$1", [ticketRef]);
            if (exists) {
              await query(
                "INSERT INTO ticket_messages (ticket_id,author_type,author_name,body) VALUES ($1,'customer',$2,$3)",
                [ticketRef, mail.fromName, mail.body]
              );
              await query(
                "UPDATE tickets SET updated_at=now(),status=CASE WHEN status IN ('resolved','closed') THEN 'open' WHEN status='waiting_customer' THEN 'in_progress' ELSE status END WHERE id=$1",
                [ticketRef]
              );
              replies++;
              processedUids.push(mail.uid);
              continue;
            }
          }

          const existingByUid = await queryOne("SELECT id FROM tickets WHERE imap_uid=$1", [mail.uid]);
          if (existingByUid) {
            processedUids.push(mail.uid); // already in system, safe to delete
            continue;
          }

          const emailDomain = mail.from.split("@")[1] ?? "";
          const customer = await queryOne<{ id: number }>(
            `SELECT id FROM customers
             WHERE (contact_email ILIKE $1
                OR  (contact_email IS NOT NULL AND split_part(lower(contact_email),'@',2) = $2))
             LIMIT 1`,
            [mail.from, emailDomain.toLowerCase()]
          );

          await query(
            `INSERT INTO tickets (customer_id,subject,body,status,priority,source,from_email,from_name,imap_uid,created_at)
             VALUES ($1,$2,$3,'open','normal','email',$4,$5,$6,$7)`,
            [customer?.id ?? null, mail.subject, mail.body, mail.from, mail.fromName, mail.uid, mail.date]
          );
          created++;
          processedUids.push(mail.uid);
        } catch (e) {
          console.error("[imap] message processing error:", e);
          errors++;
        }
      }

      // Delete processed messages from inbox so it stays clean
      if (processedUids.length > 0) {
        try {
          await client.messageDelete(processedUids.join(","), { uid: true });
        } catch (e) {
          console.error("[imap] delete error:", e);
        }
      }
    } finally {
      lock.release();
    }

    if (maxUid > lastUid) {
      await query("UPDATE imap_cursor SET last_uid=$1,last_check=now() WHERE id=1", [maxUid]);
    } else {
      await query("UPDATE imap_cursor SET last_check=now() WHERE id=1");
    }
  } catch (e) {
    console.error("[imap] poll error:", e);
    errors++;
  } finally {
    await client.logout().catch(() => null);
  }

  return { created, replies, errors };
}
