import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const BACKEND =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

type MessageParam = { role: "user" | "assistant"; content: string };

type ClinicItem = {
  slug: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
  branches: string[];
  bookingEnabled: boolean;
  heroTitle?: string;
  aboutText?: string;
};

const SEARCH_TOOL: Groq.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_clinics",
    description:
      "Platforma kayıtlı klinikleri şehir, branş ve/veya anahtar kelimeyle arar. " +
      "Kullanıcının ihtiyacını anladıktan sonra bu fonksiyonu çağır.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Şehir filtresi. Platformdaki mevcut şehirlerden biri olmalı. Opsiyonel.",
        },
        branch: {
          type: "string",
          description: "Tıbbi branş filtresi. Platformdaki mevcut branşlardan biri olmalı. Opsiyonel.",
        },
        query: {
          type: "string",
          description: "Serbest metin: klinik adı veya anahtar kelime. Opsiyonel.",
        },
      },
      required: [],
    },
  },
};

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    console.error("[ai-clinic-search] GROQ_API_KEY env var eksik!");
    return NextResponse.json({
      reply: "AI asistanı henüz yapılandırılmamış. Lütfen yöneticiyle iletişime geçin.",
      clinics: [],
      filters: {},
    });
  }

  try {
    const { messages } = (await req.json()) as { messages: MessageParam[] };
    if (!messages?.length) return NextResponse.json({ reply: "", clinics: [], filters: {} });

    // Mevcut şehir ve branşları çek
    const [citiesRes, branchesRes] = await Promise.all([
      fetch(`${BACKEND}/public/clinics/cities`).catch(() => null),
      fetch(`${BACKEND}/public/clinics/branches`).catch(() => null),
    ]);
    const cities: string[]   = citiesRes?.ok   ? await citiesRes.json()   : [];
    const branches: string[] = branchesRes?.ok ? await branchesRes.json() : [];

    const systemPrompt = `Sen xShield e-Clinic'in yapay zeka destekli klinik arama asistanısın.
Türkiye'deki hastalar sağlık sorunlarını, semptomlarını veya ihtiyaçlarını sana anlatıyor;
sen de onlara platforma kayıtlı en uygun klinikleri buluyorsun.

GÖREVIN:
1. Kullanıcının mesajını dikkatlice oku — semptom, şikâyet veya ihtiyaç ne?
2. Hangi tıbbi branşın uygun olduğunu belirle.
3. Şehir tercihi belli değilse kısa ve nazikçe sor.
4. search_clinics fonksiyonunu kullanarak klinikleri platform veritabanında ara.
5. Sonuçları empatiyle ve açıklayıcı şekilde sun.

PLATFORMDA KAYITLI ŞEHİRLER: ${cities.length ? cities.join(", ") : "henüz kayıtlı şehir bulunmuyor"}
PLATFORMDA KAYITLI BRANŞLAR: ${branches.length ? branches.join(", ") : "henüz kayıtlı branş bulunmuyor"}

KURALLAR:
- Türkçe konuş, sıcak ve profesyonel ol.
- Kesinlikle tıbbi tanı koyma; yalnızca uygun uzmanlık dalını yönlendir.
- Eğer branş listede yoksa en yakın olanı öner.
- Kullanıcı zaten şehir/branş belirttiyse tekrar sorma, direkt ara.
- Klinik bulunamazsa bunu nazikçe belirt ve başka şehir/branş dene.`;

    // Groq mesaj formatına çevir
    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // 1. İlk çağrı
    const first = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      tools: [SEARCH_TOOL],
      tool_choice: "auto",
      max_tokens: 1024,
    });

    const firstMsg = first.choices[0].message;
    let clinics: ClinicItem[] = [];
    let filters: { city?: string; branch?: string; query?: string } = {};
    let reply = "";

    if (first.choices[0].finish_reason === "tool_calls" && firstMsg.tool_calls?.length) {
      const toolCall = firstMsg.tool_calls[0];
      filters = JSON.parse(toolCall.function.arguments) as typeof filters;

      // 2. Backend'den klinikleri çek
      const qs = new URLSearchParams({ page: "1", pageSize: "6" });
      if (filters.city)   qs.set("city",   filters.city);
      if (filters.branch) qs.set("branch", filters.branch);
      if (filters.query)  qs.set("q",      filters.query);

      const clinicsRes = await fetch(`${BACKEND}/public/clinics?${qs}`).catch(() => null);
      const data = clinicsRes?.ok ? await clinicsRes.json() : { items: [] };
      clinics = data.items ?? [];

      // 3. Sonuçlarla ikinci çağrı
      const second = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          ...groqMessages,
          firstMsg,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              found: clinics.length,
              clinics: clinics.map((c) => ({
                name: c.name,
                city: c.city,
                branches: c.branches,
                bookingEnabled: c.bookingEnabled,
              })),
            }),
          },
        ],
        max_tokens: 1024,
      });

      reply = second.choices[0].message.content ?? "";
    } else {
      reply = firstMsg.content ?? "";
    }

    return NextResponse.json({ reply, clinics, filters });

  } catch (err: unknown) {
    const status  = (err as { status?: number })?.status;
    const message = (err as { message?: string })?.message ?? "";
    console.error(`[ai-clinic-search] Hata — status:${status}`, message);

    if (status === 429) {
      return NextResponse.json({
        reply: "Yapay zeka asistanı şu an yoğun, lütfen birkaç saniye bekleyip tekrar deneyin.",
        clinics: [],
        filters: {},
      });
    }

    return NextResponse.json({
      reply: "Beklenmedik bir hata oluştu, lütfen tekrar deneyin.",
      clinics: [],
      filters: {},
    });
  }
}
