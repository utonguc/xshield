using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Services;

// Long-polling ile gelen komutları işler: /start <kod>, /borc, /duyurular, /yardim
public class TelegramPollingService(
    IServiceScopeFactory scopeFactory,
    IConfiguration config,
    ILogger<TelegramPollingService> log) : BackgroundService
{
    long _offset = 0;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(config["Telegram:BotToken"]))
        {
            log.LogInformation("Telegram token yok — polling devre dışı.");
            return;
        }
        log.LogInformation("Telegram polling başladı.");

        // Native komut menüsünü (/ yardımcısı) kaydet
        try
        {
            using var setupScope = scopeFactory.CreateScope();
            var tgSetup = setupScope.ServiceProvider.GetRequiredService<TelegramService>();
            await tgSetup.PostAsync("setMyCommands", new
            {
                commands = new[]
                {
                    new { command = "borc", description = "Aidat borcunuz" },
                    new { command = "odemelerim", description = "Son ödemeleriniz" },
                    new { command = "ekodeme", description = "Ek ödeme borçlarınız" },
                    new { command = "duyurular", description = "Son duyurular" },
                    new { command = "toplantilar", description = "Yaklaşan toplantılar" },
                    new { command = "anketler", description = "Açık anketler" },
                    new { command = "ziyaretcilerim", description = "Son ziyaretçileriniz" },
                    new { command = "plakalarim", description = "Otopark plakalarınız" },
                    new { command = "iletisim", description = "Site iletişim ve IBAN" },
                    new { command = "yardim", description = "Komut listesi" },
                }
            });
            await tgSetup.PostAsync("setChatMenuButton", new { menu_button = new { type = "commands" } });
        }
        catch (Exception ex) { log.LogWarning(ex, "setMyCommands hatası"); }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var tg = scope.ServiceProvider.GetRequiredService<TelegramService>();
                var raw = await tg.GetAsync("getUpdates", $"?timeout=50&offset={_offset}");
                if (raw is null) { await Task.Delay(3000, stoppingToken); continue; }

                using var doc = JsonDocument.Parse(raw);
                if (!doc.RootElement.TryGetProperty("result", out var results)) continue;

                foreach (var upd in results.EnumerateArray())
                {
                    _offset = upd.GetProperty("update_id").GetInt64() + 1;
                    if (!upd.TryGetProperty("message", out var msg)) continue;
                    if (!msg.TryGetProperty("text", out var textEl)) continue;

                    var chatId = msg.GetProperty("chat").GetProperty("id").GetInt64();
                    var text = textEl.GetString()?.Trim() ?? "";
                    await HandleCommandAsync(scope, tg, chatId, text);
                }
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Telegram polling döngü hatası");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    async Task HandleCommandAsync(IServiceScope scope, TelegramService tg, long chatId, string text)
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cmd = text.Split(' ', 2);
        var command = cmd[0].ToLowerInvariant().Replace("@", " ").Split(' ')[0];

        // /id /grupid /chatid → bu sohbetin (grubun) chat ID'sini söyle (eşleştirme gerekmez)
        if (command is "/id" or "/grupid" or "/chatid")
        {
            await tg.SendMessageAsync(chatId,
                $"Bu sohbetin chat ID'si:\n<code>{chatId}</code>\n\nYönetici panelinde Telegram sayfasındaki <b>Site Telegram Grubu</b> alanına yapıştırın.");
            return;
        }

        // /start <kod> → eşleştirme
        if (command == "/start")
        {
            var code = cmd.Length > 1 ? cmd[1].Trim() : "";
            if (string.IsNullOrEmpty(code))
            {
                await tg.SendMessageAsync(chatId,
                    "👋 SiteYönet botuna hoş geldiniz. Hesabınızı bağlamak için paneldeki <b>Telegram</b> sayfasından aldığınız kodu kullanın.");
                return;
            }
            var user = await db.Users.FirstOrDefaultAsync(u => u.TelegramLinkCode == code);
            if (user is null)
            {
                await tg.SendMessageAsync(chatId, "❌ Kod geçersiz veya süresi dolmuş. Panelden yeni kod alın.");
                return;
            }
            user.TelegramChatId = chatId;
            user.TelegramLinkCode = null;
            await db.SaveChangesAsync();
            await tg.SendMessageAsync(chatId,
                $"✅ Hesabınız bağlandı, {Esc(user.FullName)}! Artık bildirim alacaksınız.\n\nKomutlar:\n/borc — Aidat borcunuz\n/duyurular — Son duyurular\n/yardim — Yardım");
            return;
        }

        // /yardim — bağlı olmasa da çalışır
        if (command is "/yardim" or "/menu" or "/help")
        {
            await tg.SendMessageAsync(chatId, HelpText);
            return;
        }

        // Diğer komutlar için kullanıcı bağlı olmalı
        var u2 = await db.Users.FirstOrDefaultAsync(x => x.TelegramChatId == chatId);
        if (u2 is null)
        {
            await tg.SendMessageAsync(chatId, "Hesabınız bağlı değil. Panelden Telegram kodu alıp <code>/start KOD</code> yazın.\n\n/yardim — komut listesi");
            return;
        }

        var aptIds = await db.Apartments
            .Where(a => a.SiteId == u2.SiteId && (a.OwnerId == u2.Id || a.ResidentId == u2.Id))
            .Select(a => a.Id).ToListAsync();
        var now = DateTime.UtcNow;

        switch (command)
        {
            case "/borc":
            {
                var debt = await db.DuesRecords
                    .Where(r => aptIds.Contains(r.ApartmentId) &&
                                (r.Status == DuesStatus.Pending || r.Status == DuesStatus.Overdue))
                    .SumAsync(r => (decimal?)r.Amount) ?? 0;
                await tg.SendMessageAsync(chatId, debt > 0
                    ? $"💰 Güncel aidat borcunuz: <b>{debt:N2} ₺</b>"
                    : "✅ Aidat borcunuz bulunmuyor. Teşekkürler!");
                break;
            }
            case "/odemelerim":
            {
                var pays = await db.Payments
                    .Where(p => aptIds.Contains(p.ApartmentId))
                    .OrderByDescending(p => p.PaidAt).Take(5).ToListAsync();
                if (pays.Count == 0) { await tg.SendMessageAsync(chatId, "Ödeme kaydınız yok."); break; }
                var body = "🧾 <b>Son Ödemeleriniz</b>\n\n" + string.Join("\n",
                    pays.Select(p => $"• {p.PaidAt:dd.MM.yyyy} — <b>{p.Amount:N2} ₺</b>"));
                await tg.SendMessageAsync(chatId, body);
                break;
            }
            case "/ekodeme":
            {
                var extras = await db.ExtraCollectionRecords
                    .Include(r => r.ExtraCollection)
                    .Where(r => aptIds.Contains(r.ApartmentId) && r.Status != DuesStatus.Paid && r.Status != DuesStatus.Waived)
                    .ToListAsync();
                if (extras.Count == 0) { await tg.SendMessageAsync(chatId, "Bekleyen ek ödemeniz yok."); break; }
                var body = "➕ <b>Ek Ödeme Borçlarınız</b>\n\n" + string.Join("\n",
                    extras.Select(e => $"• {Esc(e.ExtraCollection.Title)}: <b>{e.Amount:N2} ₺</b>"));
                await tg.SendMessageAsync(chatId, body);
                break;
            }
            case "/duyurular":
            {
                var anns = await db.Announcements
                    .Where(a => a.SiteId == u2.SiteId && (a.ExpiresAt == null || a.ExpiresAt > now))
                    .OrderByDescending(a => a.CreatedAt).Take(5).ToListAsync();
                if (anns.Count == 0) { await tg.SendMessageAsync(chatId, "Güncel duyuru yok."); break; }
                var body = string.Join("\n\n", anns.Select(a => $"📢 <b>{Esc(a.Title)}</b>\n{Esc(a.Content)}"));
                await tg.SendMessageAsync(chatId, body);
                break;
            }
            case "/toplantilar":
            {
                var ms = await db.Meetings
                    .Where(m => m.SiteId == u2.SiteId && m.MeetingDate > now && m.Status == MeetingStatus.Scheduled)
                    .OrderBy(m => m.MeetingDate).Take(5).ToListAsync();
                if (ms.Count == 0) { await tg.SendMessageAsync(chatId, "Yaklaşan toplantı yok."); break; }
                var body = "📅 <b>Yaklaşan Toplantılar</b>\n\n" + string.Join("\n",
                    ms.Select(m => $"• {m.MeetingDate:dd.MM.yyyy HH:mm} — {Esc(m.Title)}{(string.IsNullOrEmpty(m.Location) ? "" : $" ({Esc(m.Location!)})")}"));
                await tg.SendMessageAsync(chatId, body);
                break;
            }
            case "/anketler":
            {
                var surveys = await db.Surveys
                    .Where(s => s.SiteId == u2.SiteId && !s.IsClosed && (s.EndsAt == null || s.EndsAt > now))
                    .OrderByDescending(s => s.CreatedAt).Take(5).ToListAsync();
                if (surveys.Count == 0) { await tg.SendMessageAsync(chatId, "Açık anket yok."); break; }
                var body = "📊 <b>Açık Anketler</b>\n\n" + string.Join("\n", surveys.Select(s => $"• {Esc(s.Question)}"))
                    + "\n\nOy vermek için panelden Anketler sayfasını kullanın.";
                await tg.SendMessageAsync(chatId, body);
                break;
            }
            case "/ziyaretcilerim":
            {
                var vs = await db.Visitors
                    .Where(v => v.SiteId == u2.SiteId && v.ApartmentId != null && aptIds.Contains(v.ApartmentId.Value))
                    .OrderByDescending(v => v.EntryTime).Take(5).ToListAsync();
                if (vs.Count == 0) { await tg.SendMessageAsync(chatId, "Ziyaretçi kaydınız yok."); break; }
                var body = "🚪 <b>Son Ziyaretçileriniz</b>\n\n" + string.Join("\n",
                    vs.Select(v => $"• {Esc(v.FullName)} — {v.EntryTime:dd.MM.yyyy HH:mm} {(v.ExitTime == null ? "(içeride)" : "(çıktı)")}"));
                await tg.SendMessageAsync(chatId, body);
                break;
            }
            case "/plakalarim":
            {
                var ps = await db.ParkingPermits
                    .Where(p => p.SiteId == u2.SiteId && p.ApartmentId != null && aptIds.Contains(p.ApartmentId.Value))
                    .OrderBy(p => p.PlateNumber).ToListAsync();
                if (ps.Count == 0) { await tg.SendMessageAsync(chatId, "Otopark plakanız tanımlı değil."); break; }
                var body = "🅿️ <b>Otopark Plakalarınız</b>\n\n" + string.Join("\n",
                    ps.Select(p => $"• <code>{Esc(p.PlateNumber)}</code>{(p.IsActive ? "" : " (pasif)")}"));
                await tg.SendMessageAsync(chatId, body);
                break;
            }
            case "/iletisim":
            {
                var site = await db.Sites.FindAsync(u2.SiteId);
                var bank = await db.Banks
                    .Where(b => b.SiteId == u2.SiteId)
                    .OrderByDescending(b => b.IsDefault).FirstOrDefaultAsync();
                var sb = $"🏘️ <b>{Esc(site?.Name ?? "Site")}</b>\n";
                if (!string.IsNullOrEmpty(site?.Phone)) sb += $"📞 {Esc(site!.Phone!)}\n";
                if (!string.IsNullOrEmpty(site?.Email)) sb += $"✉️ {Esc(site!.Email!)}\n";
                if (bank != null) sb += $"\n🏦 {Esc(bank.BankName)} — {Esc(bank.AccountName)}\n<code>{Esc(bank.Iban)}</code>";
                await tg.SendMessageAsync(chatId, sb);
                break;
            }
            default:
                await tg.SendMessageAsync(chatId, HelpText);
                break;
        }
    }

    const string HelpText =
        "🤖 <b>SiteYönet Bot — Komutlar</b>\n\n" +
        "💰 /borc — Aidat borcunuz\n" +
        "🧾 /odemelerim — Son ödemeleriniz\n" +
        "➕ /ekodeme — Ek ödeme borçlarınız\n" +
        "📢 /duyurular — Son duyurular\n" +
        "📅 /toplantilar — Yaklaşan toplantılar\n" +
        "📊 /anketler — Açık anketler\n" +
        "🚪 /ziyaretcilerim — Son ziyaretçileriniz\n" +
        "🅿️ /plakalarim — Otopark plakalarınız\n" +
        "☎️ /iletisim — Site iletişim ve IBAN\n" +
        "❓ /yardim — Bu menü\n\n" +
        "İpucu: Mesaj kutusunun yanındaki <b>/</b> menüsünden de komutlara ulaşabilirsiniz.";

    static string Esc(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
