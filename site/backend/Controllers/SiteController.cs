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
[Route("api/site")]
[Authorize]
public class SiteController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var site = await db.Sites.FindAsync(SiteId);
        if (site is null) return NotFound();

        var count = await db.Apartments.CountAsync(a => a.SiteId == SiteId);
        return Ok(MapSite(site, count));
    }

    [HttpPut]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(UpdateSiteRequest req)
    {
        var site = await db.Sites.FindAsync(SiteId);
        if (site is null) return NotFound();

        site.Name = req.Name;
        site.Address = req.Address;
        site.Phone = req.Phone;
        site.Email = req.Email;
        site.TaxNumber = req.TaxNumber;
        site.DuesBaseAmount = req.DuesBaseAmount;
        site.TelegramGroupChatId = req.TelegramGroupChatId;
        await db.SaveChangesAsync();

        var count = await db.Apartments.CountAsync(a => a.SiteId == SiteId);
        return Ok(MapSite(site, count));
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var site = await db.Sites.FindAsync(SiteId);
        if (site is null) return NotFound();

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalApartments = await db.Apartments.CountAsync(a => a.SiteId == SiteId);
        var totalResidents = await db.Apartments.CountAsync(a => a.SiteId == SiteId && a.ResidentId != null);

        var duesThisMonth = await db.DuesRecords
            .Include(d => d.DuesPeriod)
            .Where(d => d.SiteId == SiteId && d.DuesPeriod.Year == now.Year && d.DuesPeriod.Month == now.Month)
            .ToListAsync();

        var pendingDues = duesThisMonth.Count(d => d.Status == DuesStatus.Pending || d.Status == DuesStatus.Overdue);
        var totalDuesThisMonth = duesThisMonth.Sum(d => d.Amount);
        var collectedThisMonth = await db.Payments
            .Where(p => p.SiteId == SiteId && p.PaidAt >= startOfMonth)
            .SumAsync(p => p.Amount);

        var openIssues = await db.Issues.CountAsync(i => i.SiteId == SiteId &&
            (i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress));

        var upcomingMeetings = await db.Meetings.CountAsync(m => m.SiteId == SiteId &&
            m.MeetingDate > now && m.Status == MeetingStatus.Scheduled);

        var recentPayments = await db.Payments
            .Include(p => p.Apartment).ThenInclude(a => a.Block)
            .Where(p => p.SiteId == SiteId)
            .OrderByDescending(p => p.PaidAt)
            .Take(5)
            .Select(p => new RecentPaymentDto(
                p.Id,
                p.Apartment.Number,
                p.Apartment.Block.Name,
                p.Amount,
                p.PaidAt
            ))
            .ToListAsync();

        var recentIssues = await db.Issues
            .Where(i => i.SiteId == SiteId)
            .OrderByDescending(i => i.CreatedAt)
            .Take(5)
            .Select(i => new RecentIssueDto(
                i.Id,
                i.Title,
                i.Status.ToString(),
                i.Priority.ToString(),
                i.CreatedAt
            ))
            .ToListAsync();

        // Son 6 ay tahsilat/gider trendi
        string[] aylar = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
        var trend = new List<TrendPointDto>();
        for (int i = 5; i >= 0; i--)
        {
            var d = startOfMonth.AddMonths(-i);
            var next = d.AddMonths(1);
            var coll = await db.Payments
                .Where(p => p.SiteId == SiteId && p.PaidAt >= d && p.PaidAt < next)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;
            var exp = await db.Expenses
                .Where(e => e.SiteId == SiteId && e.ExpenseDate >= d && e.ExpenseDate < next)
                .SumAsync(e => (decimal?)e.Amount) ?? 0;
            trend.Add(new TrendPointDto($"{aylar[d.Month - 1]} {d.Year % 100:00}", coll, exp));
        }

        // Gider dağılımı (kategori bazlı, tüm zamanlar)
        var expenses = await db.Expenses.Where(e => e.SiteId == SiteId).ToListAsync();
        var breakdown = expenses
            .GroupBy(e => e.Category)
            .Select(g => new CategoryAmountDto(g.Key.ToString(), g.Sum(e => e.Amount)))
            .OrderByDescending(x => x.Amount)
            .ToList();

        return Ok(new DashboardDto(
            totalApartments,
            totalResidents,
            pendingDues,
            totalDuesThisMonth,
            collectedThisMonth,
            openIssues,
            upcomingMeetings,
            site.Tier.ToString(),
            SubscriptionService.GetMonthlyPrice(site.Tier),
            recentPayments,
            recentIssues,
            trend,
            breakdown
        ));
    }

    // Yönetim devri — mevcut SiteAdmin, başka bir kullanıcıya yetkiyi devreder
    [HttpPost("transfer-admin")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> TransferAdmin([FromBody] TransferAdminRequest req)
    {
        var currentAdmin = await db.Users.FindAsync(UserId);
        if (currentAdmin is null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, currentAdmin.PasswordHash))
            return BadRequest("Mevcut şifreniz hatalı.");

        var newAdmin = await db.Users.FirstOrDefaultAsync(u => u.Id == req.NewAdminUserId && u.SiteId == SiteId);
        if (newAdmin is null) return BadRequest("Kullanıcı bulunamadı.");
        if (newAdmin.Id == currentAdmin.Id) return BadRequest("Kendinizi seçemezsiniz.");

        newAdmin.Role = UserRole.SiteAdmin;
        currentAdmin.Role = UserRole.Manager;
        await db.SaveChangesAsync();

        return Ok(new { message = $"Yönetim {newAdmin.FullName} adlı kullanıcıya devredildi." });
    }

    static SiteDto MapSite(Site s, int count) => new(
        s.Id, s.Name, s.Address, s.Phone, s.Email, s.LogoUrl, s.TaxNumber,
        s.Tier.ToString(), SubscriptionService.GetMonthlyPrice(s.Tier),
        s.DuesBaseAmount, s.TelegramGroupChatId, s.IsActive, count, s.CreatedAt
    );

    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
