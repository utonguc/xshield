using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/messages")]
[Authorize]
public class MessageController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Mesajlaşılabilecek kişiler (kendisi hariç tüm aktif kullanıcılar)
    [HttpGet("contacts")]
    public async Task<IActionResult> Contacts()
    {
        var users = await db.Users
            .Include(u => u.OwnedApartments).ThenInclude(a => a.Block)
            .Include(u => u.ResidentApartments).ThenInclude(a => a.Block)
            .Where(u => u.SiteId == SiteId && u.IsActive && u.Id != UserId)
            .ToListAsync();

        // Bu kullanıcıyla geçen tüm mesajlar (özet için)
        var myMessages = await db.Messages
            .Where(m => m.SiteId == SiteId && (m.FromUserId == UserId || m.ToUserId == UserId))
            .ToListAsync();

        var contacts = users.Select(u =>
        {
            var conv = myMessages
                .Where(m => m.FromUserId == u.Id || m.ToUserId == u.Id)
                .OrderByDescending(m => m.CreatedAt)
                .ToList();
            var last = conv.FirstOrDefault();
            var unread = conv.Count(m => m.FromUserId == u.Id && !m.IsRead);

            var apts = u.OwnedApartments.Select(a => $"{a.Block.Name} - {a.Number}")
                .Concat(u.ResidentApartments.Select(a => $"{a.Block.Name} - {a.Number}"))
                .Distinct().ToList();

            return new ContactDto(
                u.Id, u.FullName, u.Role.ToString(), apts,
                unread, last?.Content, last?.CreatedAt
            );
        })
        .OrderByDescending(c => c.LastMessageAt ?? DateTime.MinValue)
        .ThenBy(c => c.FullName)
        .ToList();

        return Ok(contacts);
    }

    // Belirli bir kullanıcıyla olan yazışma
    [HttpGet("conversation/{otherUserId}")]
    public async Task<IActionResult> Conversation(int otherUserId)
    {
        var other = await db.Users.FirstOrDefaultAsync(u => u.Id == otherUserId && u.SiteId == SiteId);
        if (other is null) return NotFound();

        var messages = await db.Messages
            .Include(m => m.FromUser)
            .Where(m => m.SiteId == SiteId &&
                ((m.FromUserId == UserId && m.ToUserId == otherUserId) ||
                 (m.FromUserId == otherUserId && m.ToUserId == UserId)))
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        // Karşıdan gelen okunmamışları okundu yap
        var unread = messages.Where(m => m.FromUserId == otherUserId && !m.IsRead).ToList();
        if (unread.Count > 0)
        {
            unread.ForEach(m => m.IsRead = true);
            await db.SaveChangesAsync();
        }

        var result = messages.Select(m => new MessageDto(
            m.Id, m.FromUserId, m.FromUser.FullName, m.ToUserId,
            m.Content, m.IsRead, m.FromUserId == UserId, m.CreatedAt
        )).ToList();

        return Ok(new { otherName = other.FullName, messages = result });
    }

    [HttpPost]
    public async Task<IActionResult> Send(SendMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Content))
            return BadRequest("Mesaj boş olamaz.");
        if (req.ToUserId == UserId)
            return BadRequest("Kendinize mesaj gönderemezsiniz.");

        var recipient = await db.Users.FirstOrDefaultAsync(u => u.Id == req.ToUserId && u.SiteId == SiteId && u.IsActive);
        if (recipient is null) return BadRequest("Alıcı bulunamadı.");

        var msg = new Message
        {
            SiteId = SiteId,
            FromUserId = UserId,
            ToUserId = req.ToUserId,
            Content = req.Content.Trim(),
        };
        db.Messages.Add(msg);
        await db.SaveChangesAsync();

        return Ok(new MessageDto(msg.Id, msg.FromUserId, "", msg.ToUserId, msg.Content, false, true, msg.CreatedAt));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var count = await db.Messages.CountAsync(m => m.SiteId == SiteId && m.ToUserId == UserId && !m.IsRead);
        return Ok(new { count });
    }
}
