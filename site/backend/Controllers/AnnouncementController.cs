using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;
using SitePlatform.Api.Services;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementController(AppDbContext db, NotificationService notify) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var now = DateTime.UtcNow;
        var items = await db.Announcements
            .Where(a => a.SiteId == SiteId && (a.ExpiresAt == null || a.ExpiresAt > now))
            .OrderByDescending(a => a.IsPinned).ThenByDescending(a => a.CreatedAt)
            .ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateAnnouncementRequest req)
    {
        var ann = new Announcement
        {
            SiteId = SiteId,
            Title = req.Title,
            Content = req.Content,
            IsPinned = req.IsPinned,
            Category = req.Category,
            ExpiresAt = req.ExpiresAt?.ToUniversalTime(),
            CreatedById = UserId
        };
        db.Announcements.Add(ann);
        await db.SaveChangesAsync();
        await notify.NotifyAnnouncementAsync(SiteId, ann.Title, ann.Content);
        return Ok(Map(ann));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateAnnouncementRequest req)
    {
        var ann = await db.Announcements.FirstOrDefaultAsync(a => a.Id == id && a.SiteId == SiteId);
        if (ann is null) return NotFound();

        ann.Title = req.Title;
        ann.Content = req.Content;
        ann.IsPinned = req.IsPinned;
        ann.Category = req.Category;
        ann.ExpiresAt = req.ExpiresAt?.ToUniversalTime();
        await db.SaveChangesAsync();
        return Ok(Map(ann));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var ann = await db.Announcements.FirstOrDefaultAsync(a => a.Id == id && a.SiteId == SiteId);
        if (ann is null) return NotFound();
        db.Announcements.Remove(ann);
        await db.SaveChangesAsync();
        return NoContent();
    }

    static AnnouncementDto Map(Announcement a) => new(
        a.Id, a.Title, a.Content, a.IsPinned,
        a.Category.ToString(), a.CreatedById, a.CreatedAt, a.ExpiresAt
    );
}
