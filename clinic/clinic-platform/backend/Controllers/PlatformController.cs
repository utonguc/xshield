using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.DTOs;
using ClinicPlatform.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Controllers;

// ══════════════════════════════════════════════════════════════════════════════
// Klinik taraflı: duyurular + destek talepleri
// ══════════════════════════════════════════════════════════════════════════════
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PlatformController : ControllerBase
{
    private readonly AppDbContext _db;
    public PlatformController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId, string clinicName, string fullName)?> GetCtxAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.Include(u => u.Clinic).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId, user.Clinic?.Name ?? "", user.FullName);
    }

    // ── Duyurular ─────────────────────────────────────────────────────────────

    // GET api/platform/announcements  — aktif & okunmamış duyurular
    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements()
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var clinicId = ctx.Value.clinicId;
        var now = DateTime.UtcNow;

        var announcements = await _db.PlatformAnnouncements
            .Where(a => a.IsPublished && (a.ExpiresAtUtc == null || a.ExpiresAtUtc > now))
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync();

        var readIds = await _db.PlatformAnnouncementReads
            .Where(r => r.ClinicId == clinicId)
            .Select(r => r.AnnouncementId)
            .ToListAsync();

        var result = announcements.Select(a => new AnnouncementResponse
        {
            Id = a.Id, Title = a.Title, Body = a.Body, Type = a.Type,
            IsPublished = a.IsPublished, ExpiresAtUtc = a.ExpiresAtUtc,
            CreatedAtUtc = a.CreatedAtUtc,
            ReadCount = 0,
            IsRead = readIds.Contains(a.Id),
        });

        return Ok(result);
    }

    // GET api/platform/announcements/unread-count
    [HttpGet("announcements/unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var clinicId = ctx.Value.clinicId;
        var now = DateTime.UtcNow;

        var total = await _db.PlatformAnnouncements
            .CountAsync(a => a.IsPublished && (a.ExpiresAtUtc == null || a.ExpiresAtUtc > now));

        var read = await _db.PlatformAnnouncementReads
            .CountAsync(r => r.ClinicId == clinicId);

        return Ok(new { count = Math.Max(0, total - read) });
    }

    // POST api/platform/announcements/{id}/read
    [HttpPost("announcements/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var clinicId = ctx.Value.clinicId;

        var exists = await _db.PlatformAnnouncementReads
            .AnyAsync(r => r.AnnouncementId == id && r.ClinicId == clinicId);
        if (!exists)
        {
            _db.PlatformAnnouncementReads.Add(new PlatformAnnouncementRead
            {
                AnnouncementId = id, ClinicId = clinicId,
            });
            await _db.SaveChangesAsync();
        }
        return Ok(new { message = "Okundu." });
    }

    // ── Destek Talepleri ──────────────────────────────────────────────────────

    // POST api/platform/support
    [HttpPost("support")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateSupportTicketRequest req)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Subject))
            return BadRequest(new { message = "Konu zorunlu." });
        if (string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Mesaj zorunlu." });

        var ticket = new SupportTicket
        {
            ClinicId   = ctx.Value.clinicId,
            ClinicName = ctx.Value.clinicName,
            Subject    = req.Subject.Trim(),
            Body       = req.Body.Trim(),
            PageUrl    = req.PageUrl?.Trim(),
        };
        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync();
        return Ok(new { id = ticket.Id, message = "Destek talebiniz iletildi." });
    }

    // GET api/platform/support  — klinik kendi biletlerini görür
    [HttpGet("support")]
    public async Task<IActionResult> GetMyTickets()
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var tickets = await _db.SupportTickets
            .Where(t => t.ClinicId == ctx.Value.clinicId)
            .Include(t => t.Replies)
            .OrderByDescending(t => t.UpdatedAtUtc)
            .ToListAsync();

        return Ok(tickets.Select(ToResponse));
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SuperAdmin taraflı: duyuru yönetimi + destek talepleri
// ══════════════════════════════════════════════════════════════════════════════
[ApiController]
[Route("api/superadmin")]
[Authorize(Roles = "SuperAdmin")]
public class SuperAdminPlatformController : ControllerBase
{
    private readonly AppDbContext _db;
    public SuperAdminPlatformController(AppDbContext db) => _db = db;

    private string AdminName => User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")
                                ?? User.FindFirstValue(JwtRegisteredClaimNames.UniqueName)
                                ?? "Admin";

    // ── Duyurular ─────────────────────────────────────────────────────────────

    // GET api/superadmin/announcements
    [HttpGet("announcements")]
    public async Task<IActionResult> ListAnnouncements()
    {
        var items = await _db.PlatformAnnouncements
            .Include(a => a.Reads)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync();

        return Ok(items.Select(a => new AnnouncementResponse
        {
            Id = a.Id, Title = a.Title, Body = a.Body, Type = a.Type,
            IsPublished = a.IsPublished, ExpiresAtUtc = a.ExpiresAtUtc,
            CreatedAtUtc = a.CreatedAtUtc,
            ReadCount = a.Reads.Count,
            IsRead = false,
        }));
    }

    // POST api/superadmin/announcements
    [HttpPost("announcements")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { message = "Başlık zorunlu." });

        var item = new PlatformAnnouncement
        {
            Title = req.Title.Trim(), Body = req.Body.Trim(),
            Type = req.Type, IsPublished = req.IsPublished,
            ExpiresAtUtc = req.ExpiresAtUtc,
        };
        _db.PlatformAnnouncements.Add(item);
        await _db.SaveChangesAsync();
        return Ok(new { id = item.Id, message = "Duyuru oluşturuldu." });
    }

    // PATCH api/superadmin/announcements/{id}/publish
    [HttpPatch("announcements/{id:guid}/publish")]
    public async Task<IActionResult> TogglePublish(Guid id)
    {
        var item = await _db.PlatformAnnouncements.FindAsync(id);
        if (item is null) return NotFound();
        item.IsPublished = !item.IsPublished;
        await _db.SaveChangesAsync();
        return Ok(new { id = item.Id, isPublished = item.IsPublished });
    }

    // DELETE api/superadmin/announcements/{id}
    [HttpDelete("announcements/{id:guid}")]
    public async Task<IActionResult> DeleteAnnouncement(Guid id)
    {
        var item = await _db.PlatformAnnouncements.FindAsync(id);
        if (item is null) return NotFound();
        _db.PlatformAnnouncements.Remove(item);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }

    // ── Destek Talepleri ──────────────────────────────────────────────────────

    // GET api/superadmin/support
    [HttpGet("support")]
    public async Task<IActionResult> ListTickets([FromQuery] string? status)
    {
        var q = _db.SupportTickets.Include(t => t.Replies).AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(t => t.Status == status);
        var tickets = await q.OrderByDescending(t => t.UpdatedAtUtc).ToListAsync();
        return Ok(tickets.Select(SuperAdminPlatformController.ToResponse));
    }

    // GET api/superadmin/support/count
    [HttpGet("support/count")]
    public async Task<IActionResult> CountOpenTickets()
    {
        var count = await _db.SupportTickets.CountAsync(t => t.Status == SupportTicketStatuses.Open);
        return Ok(new { count });
    }

    // POST api/superadmin/support/{id}/reply
    [HttpPost("support/{id:guid}/reply")]
    public async Task<IActionResult> Reply(Guid id, [FromBody] SupportTicketReplyRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Yanıt boş olamaz." });

        var ticket = await _db.SupportTickets.FindAsync(id);
        if (ticket is null) return NotFound();

        _db.SupportTicketReplies.Add(new SupportTicketReply
        {
            TicketId    = id,
            Body        = req.Body.Trim(),
            IsFromAdmin = true,
            AuthorName  = AdminName,
        });

        ticket.Status       = SupportTicketStatuses.InProgress;
        ticket.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Yanıt eklendi." });
    }

    // PATCH api/superadmin/support/{id}/status
    [HttpPatch("support/{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTicketStatusRequest req)
    {
        var ticket = await _db.SupportTickets.FindAsync(id);
        if (ticket is null) return NotFound();
        ticket.Status       = req.Status;
        ticket.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Durum güncellendi." });
    }

    private static SupportTicketResponse ToResponse(SupportTicket t) => new()
    {
        Id = t.Id, ClinicId = t.ClinicId, ClinicName = t.ClinicName,
        Subject = t.Subject, Body = t.Body, PageUrl = t.PageUrl, Status = t.Status,
        CreatedAtUtc = t.CreatedAtUtc, UpdatedAtUtc = t.UpdatedAtUtc,
        ReplyCount = t.Replies.Count,
        Replies = t.Replies.OrderBy(r => r.CreatedAtUtc).Select(r => new SupportTicketReplyResponse
        {
            Id = r.Id, Body = r.Body, IsFromAdmin = r.IsFromAdmin,
            AuthorName = r.AuthorName, CreatedAtUtc = r.CreatedAtUtc,
        }).ToList(),
    };
}

// Extension for PlatformController to share ToResponse
internal static class TicketExtensions
{
    internal static SupportTicketResponse ToResponse(this SupportTicket t) => new()
    {
        Id = t.Id, ClinicId = t.ClinicId, ClinicName = t.ClinicName,
        Subject = t.Subject, Body = t.Body, PageUrl = t.PageUrl, Status = t.Status,
        CreatedAtUtc = t.CreatedAtUtc, UpdatedAtUtc = t.UpdatedAtUtc,
        ReplyCount = t.Replies.Count,
        Replies = t.Replies.OrderBy(r => r.CreatedAtUtc).Select(r => new SupportTicketReplyResponse
        {
            Id = r.Id, Body = r.Body, IsFromAdmin = r.IsFromAdmin,
            AuthorName = r.AuthorName, CreatedAtUtc = r.CreatedAtUtc,
        }).ToList(),
    };
}
