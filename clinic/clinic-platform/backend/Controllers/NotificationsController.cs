using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.DTOs;
using ClinicPlatform.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId);
    }

    private static string TimeAgo(DateTime utc)
    {
        var diff = DateTime.UtcNow - utc;
        if (diff.TotalMinutes < 1)  return "Az önce";
        if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes} dk önce";
        if (diff.TotalHours < 24)   return $"{(int)diff.TotalHours} sa önce";
        if (diff.TotalDays < 7)     return $"{(int)diff.TotalDays} gün önce";
        return utc.ToLocalTime().ToString("dd MMM yyyy", new System.Globalization.CultureInfo("tr-TR"));
    }

    private static NotificationResponse ToResponse(Notification n) => new()
    {
        Id           = n.Id,
        Title        = n.Title,
        Message      = n.Message,
        Type         = n.Type,
        Link         = n.Link,
        IsRead       = n.IsRead,
        CreatedAtUtc = n.CreatedAtUtc,
        TimeAgo      = TimeAgo(n.CreatedAtUtc),
    };

    // GET api/notifications?unreadOnly=true&limit=20
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool unreadOnly = false, [FromQuery] int limit = 50)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, _) = ctx.Value;

        var q = _db.Notifications.Where(x => x.UserId == userId);
        if (unreadOnly) q = q.Where(x => !x.IsRead);

        var items = await q
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(limit)
            .ToListAsync();

        return Ok(items.Select(ToResponse));
    }

    // GET api/notifications/unread-count
    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, _) = ctx.Value;

        var count = await _db.Notifications.CountAsync(x => x.UserId == userId && !x.IsRead);
        return Ok(new { count });
    }

    // PATCH api/notifications/{id}/read
    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, _) = ctx.Value;

        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (n is null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Okundu." });
    }

    // POST api/notifications/read-all
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, _) = ctx.Value;

        await _db.Notifications
            .Where(x => x.UserId == userId && !x.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true));

        return Ok(new { message = "Tümü okundu olarak işaretlendi." });
    }

    // DELETE api/notifications/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, _) = ctx.Value;

        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (n is null) return NotFound();
        _db.Notifications.Remove(n);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Bildirim silindi." });
    }

    // DELETE api/notifications/clear-all
    [HttpDelete("clear-all")]
    public async Task<IActionResult> ClearAll()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, _) = ctx.Value;

        await _db.Notifications.Where(x => x.UserId == userId).ExecuteDeleteAsync();
        return Ok(new { message = "Tüm bildirimler silindi." });
    }

    // POST api/notifications  (internal / test: yeni bildirim oluştur)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var n = new Notification
        {
            ClinicId = clinicId,
            UserId   = req.UserId,
            Title    = req.Title.Trim(),
            Message  = req.Message.Trim(),
            Type     = req.Type,
            Link     = req.Link,
        };
        _db.Notifications.Add(n);
        await _db.SaveChangesAsync();
        return Ok(ToResponse(n));
    }
}
