using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.Services;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/telegram")]
[Authorize]
public class TelegramController(AppDbContext db, TelegramService tg, NotificationService notify) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Kullanıcının bağlantı durumu + bot bilgisi
    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        var user = await db.Users.FindAsync(UserId);
        return Ok(new
        {
            enabled = tg.IsEnabled,
            botUsername = tg.BotUsername,
            linked = user?.TelegramChatId != null
        });
    }

    // Tek kullanımlık eşleştirme kodu üret
    [HttpPost("link-code")]
    public async Task<IActionResult> LinkCode()
    {
        if (!tg.IsEnabled) return BadRequest("Telegram entegrasyonu yapılandırılmamış.");
        var user = await db.Users.FindAsync(UserId);
        if (user is null) return NotFound();

        var code = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        user.TelegramLinkCode = code;
        await db.SaveChangesAsync();

        var deep = tg.BotUsername is not null ? $"https://t.me/{tg.BotUsername}?start={code}" : null;
        return Ok(new { code, deepLink = deep, botUsername = tg.BotUsername });
    }

    [HttpPost("unlink")]
    public async Task<IActionResult> Unlink()
    {
        var user = await db.Users.FindAsync(UserId);
        if (user is null) return NotFound();
        user.TelegramChatId = null;
        user.TelegramLinkCode = null;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Yönetici: borçlulara hatırlatma gönder
    [HttpPost("remind-debtors")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> RemindDebtors()
    {
        if (!tg.IsEnabled) return BadRequest("Telegram entegrasyonu yapılandırılmamış.");
        var sent = await notify.RemindDebtorsAsync(SiteId);
        return Ok(new { message = $"{sent} borçlu sakine hatırlatma gönderildi." });
    }

    // Yönetici: serbest duyuru/mesaj yayını (bağlı sakinler + grup)
    [HttpPost("broadcast")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Broadcast([FromBody] BroadcastRequest req)
    {
        if (!tg.IsEnabled) return BadRequest("Telegram entegrasyonu yapılandırılmamış.");
        if (string.IsNullOrWhiteSpace(req.Message)) return BadRequest("Mesaj boş olamaz.");

        var ids = await db.Users
            .Where(u => u.SiteId == SiteId && u.IsActive && u.TelegramChatId != null)
            .Select(u => u.TelegramChatId!.Value).ToListAsync();
        foreach (var id in ids) await tg.SendMessageAsync(id, $"📣 {req.Message}");

        var site = await db.Sites.FindAsync(SiteId);
        if (!string.IsNullOrWhiteSpace(site?.TelegramGroupChatId))
            await tg.SendMessageAsync(site.TelegramGroupChatId, $"📣 {req.Message}");

        return Ok(new { message = $"{ids.Count} kişiye gönderildi." });
    }
}

public record BroadcastRequest(string Message);
