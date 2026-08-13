using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Services;

// Olay bazlı Telegram bildirimleri
public class NotificationService(AppDbContext db, TelegramService tg)
{
    // Yeni duyuru → bağlı tüm sakinlere + site grubuna
    public async Task NotifyAnnouncementAsync(int siteId, string title, string content)
    {
        if (!tg.IsEnabled) return;
        var msg = $"📢 <b>Yeni Duyuru</b>\n\n<b>{Esc(title)}</b>\n{Esc(content)}";

        var chatIds = await db.Users
            .Where(u => u.SiteId == siteId && u.IsActive && u.TelegramChatId != null)
            .Select(u => u.TelegramChatId!.Value)
            .ToListAsync();
        foreach (var id in chatIds) await tg.SendMessageAsync(id, msg);

        var site = await db.Sites.FindAsync(siteId);
        if (!string.IsNullOrWhiteSpace(site?.TelegramGroupChatId))
            await tg.SendMessageAsync(site.TelegramGroupChatId, msg);
    }

    // Borçlulara aidat hatırlatması (bağlı olanlara birebir)
    public async Task<int> RemindDebtorsAsync(int siteId)
    {
        if (!tg.IsEnabled) return 0;

        var users = await db.Users
            .Where(u => u.SiteId == siteId && u.IsActive && u.TelegramChatId != null)
            .ToListAsync();

        int sent = 0;
        foreach (var u in users)
        {
            var aptIds = await db.Apartments
                .Where(a => a.SiteId == siteId && (a.OwnerId == u.Id || a.ResidentId == u.Id))
                .Select(a => a.Id).ToListAsync();
            if (aptIds.Count == 0) continue;

            var debt = await db.DuesRecords
                .Where(r => aptIds.Contains(r.ApartmentId) &&
                            (r.Status == DuesStatus.Pending || r.Status == DuesStatus.Overdue))
                .SumAsync(r => (decimal?)r.Amount) ?? 0;
            if (debt <= 0) continue;

            await tg.SendMessageAsync(u.TelegramChatId!.Value,
                $"💰 <b>Aidat Hatırlatması</b>\n\nSayın {Esc(u.FullName)}, güncel aidat borcunuz: <b>{debt:N2} ₺</b>.\nÖdeme için site yönetimiyle iletişime geçebilirsiniz.");
            sent++;
        }
        return sent;
    }

    static string Esc(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
