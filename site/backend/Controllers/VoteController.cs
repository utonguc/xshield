using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/votes")]
[Authorize]
public class VoteController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Aday gösterilebilecek kullanıcılar — tüm sakinler erişebilir
    [HttpGet("eligible-users")]
    public async Task<IActionResult> EligibleUsers()
    {
        var users = await db.Users
            .Where(u => u.SiteId == SiteId && u.IsActive && u.Id != UserId)
            .OrderBy(u => u.FullName)
            .Select(u => new { u.Id, u.FullName, u.Email, Role = u.Role.ToString() })
            .ToListAsync();
        return Ok(users);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var votes = await db.AdminVotes
            .Include(v => v.Nominee)
            .Include(v => v.StartedBy)
            .Include(v => v.Choices)
            .Where(v => v.SiteId == SiteId)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();

        // Süresi dolmuş aktif oylamaları otomatik sonuçlandır
        foreach (var v in votes.Where(v => v.Status == VoteStatus.Active && v.EndsAt < DateTime.UtcNow))
            await FinalizeVote(v);

        return Ok(votes.Select(MapVote));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var vote = await LoadVote(id);
        if (vote is null) return NotFound();
        if (vote.Status == VoteStatus.Active && vote.EndsAt < DateTime.UtcNow)
            await FinalizeVote(vote);
        return Ok(MapVote(vote));
    }

    // Oylama başlat — herhangi bir sakin başlatabilir
    [HttpPost]
    public async Task<IActionResult> Start([FromBody] StartVoteRequest req)
    {
        // Zaten aktif bir oylama varsa başlatma
        var existing = await db.AdminVotes
            .AnyAsync(v => v.SiteId == SiteId && v.Status == VoteStatus.Active);
        if (existing) return BadRequest("Zaten devam eden bir oylama var.");

        var nominee = await db.Users.FirstOrDefaultAsync(u => u.Id == req.NomineeId && u.SiteId == SiteId && u.IsActive);
        if (nominee is null) return BadRequest("Aday kullanıcı bulunamadı.");
        if (nominee.Id == UserId) return BadRequest("Kendinizi aday gösteremezsiniz.");

        var vote = new AdminVote
        {
            SiteId = SiteId,
            NomineeId = req.NomineeId,
            StartedById = UserId,
            Reason = req.Reason,
            EndsAt = DateTime.UtcNow.AddHours(req.DurationHours > 0 ? req.DurationHours : 48),
            QuorumPercent = 51
        };
        db.AdminVotes.Add(vote);
        await db.SaveChangesAsync();
        return Ok(MapVote(await LoadVote(vote.Id)));
    }

    // Oy kullan
    [HttpPost("{id}/cast")]
    public async Task<IActionResult> Cast(int id, [FromBody] CastVoteRequest req)
    {
        var vote = await LoadVote(id);
        if (vote is null) return NotFound();
        if (vote.Status != VoteStatus.Active) return BadRequest("Bu oylama aktif değil.");
        if (vote.EndsAt < DateTime.UtcNow) return BadRequest("Oylama süresi doldu.");

        // Daha önce oy kullandı mı?
        var existing = vote.Choices.FirstOrDefault(c => c.UserId == UserId);
        if (existing is not null)
        {
            existing.InFavor = req.InFavor;
            existing.VotedAt = DateTime.UtcNow;
        }
        else
        {
            db.AdminVoteChoices.Add(new AdminVoteChoice
            {
                AdminVoteId = id, UserId = UserId, InFavor = req.InFavor
            });
        }
        await db.SaveChangesAsync();

        // Oy çokluğu sağlandı mı kontrol et
        await CheckAndFinalize(vote.Id);

        return Ok(MapVote(await LoadVote(id)));
    }

    // İptal et — oylamayı başlatan veya mevcut admin iptal edebilir
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var vote = await LoadVote(id);
        if (vote is null) return NotFound();
        if (vote.Status != VoteStatus.Active) return BadRequest("Bu oylama aktif değil.");

        var isAdmin = User.FindFirstValue(ClaimTypes.Role) is "SiteAdmin";
        if (vote.StartedById != UserId && !isAdmin)
            return Forbid();

        vote.Status = VoteStatus.Cancelled;
        await db.SaveChangesAsync();
        return Ok(new { message = "Oylama iptal edildi." });
    }

    // Oylama sonucunu kontrol et ve gerekirse uygula
    async Task CheckAndFinalize(int voteId)
    {
        var vote = await LoadVote(voteId);
        if (vote is null || vote.Status != VoteStatus.Active) return;

        var totalResidents = await db.Users.CountAsync(u => u.SiteId == SiteId && u.IsActive);
        var yesCount = vote.Choices.Count(c => c.InFavor);
        var participationRate = totalResidents > 0 ? (double)vote.Choices.Count / totalResidents * 100 : 0;
        var yesRate = vote.Choices.Count > 0 ? (double)yesCount / vote.Choices.Count * 100 : 0;

        // En az %30 katılım VE evet oylarının %51'i gerekli
        if (participationRate >= 30 && yesRate >= vote.QuorumPercent)
            await FinalizeVote(vote, passed: true);
    }

    async Task FinalizeVote(AdminVote vote, bool? passed = null)
    {
        if (passed is null)
        {
            // Süre doldu, son kez kontrol et
            var yesCount = vote.Choices.Count(c => c.InFavor);
            var totalResidents = await db.Users.CountAsync(u => u.SiteId == vote.SiteId && u.IsActive);
            var participationRate = totalResidents > 0 ? (double)vote.Choices.Count / totalResidents * 100 : 0;
            var yesRate = vote.Choices.Count > 0 ? (double)yesCount / vote.Choices.Count * 100 : 0;
            passed = participationRate >= 30 && yesRate >= vote.QuorumPercent;
        }

        if (passed == true)
        {
            // Mevcut admin(ler)i Yönetici yap
            var currentAdmins = await db.Users
                .Where(u => u.SiteId == vote.SiteId && u.Role == UserRole.SiteAdmin)
                .ToListAsync();
            currentAdmins.ForEach(u => u.Role = UserRole.Manager);

            // Adayı SiteAdmin yap
            var nominee = await db.Users.FindAsync(vote.NomineeId);
            if (nominee is not null) nominee.Role = UserRole.SiteAdmin;

            vote.Status = VoteStatus.Passed;
        }
        else
        {
            vote.Status = VoteStatus.Failed;
        }
        await db.SaveChangesAsync();
    }

    async Task<AdminVote?> LoadVote(int id) =>
        await db.AdminVotes
            .Include(v => v.Nominee)
            .Include(v => v.StartedBy)
            .Include(v => v.Choices).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(v => v.Id == id && v.SiteId == SiteId);

    object MapVote(AdminVote? v)
    {
        if (v is null) return new { };
        var totalResidents = db.Users.Count(u => u.SiteId == SiteId && u.IsActive);
        var yesCount = v.Choices.Count(c => c.InFavor);
        var noCount = v.Choices.Count(c => !c.InFavor);
        var myVote = v.Choices.FirstOrDefault(c => c.UserId == UserId);

        return new
        {
            v.Id, v.Reason, Status = v.Status.ToString(),
            v.StartsAt, v.EndsAt, v.QuorumPercent,
            Nominee = new { v.Nominee.Id, v.Nominee.FullName, v.Nominee.Email },
            StartedBy = new { v.StartedBy.Id, v.StartedBy.FullName },
            YesCount = yesCount, NoCount = noCount,
            TotalVoters = v.Choices.Count, TotalEligible = totalResidents,
            ParticipationPercent = totalResidents > 0 ? Math.Round((double)v.Choices.Count / totalResidents * 100, 1) : 0,
            YesPercent = v.Choices.Count > 0 ? Math.Round((double)yesCount / v.Choices.Count * 100, 1) : 0,
            MyVote = myVote == null ? (bool?)null : myVote.InFavor,
            v.CreatedAt,
            Voters = v.Choices.Select(c => new { c.User.FullName, c.InFavor, c.VotedAt })
        };
    }
}

public record StartVoteRequest(int NomineeId, string Reason, int DurationHours = 48);
public record CastVoteRequest(bool InFavor);
