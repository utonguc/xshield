using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SitePlatform.Api.Data;
using SitePlatform.Api.Models;
using SitePlatform.Api.Services;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/superadmin")]
public class SuperAdminController(AppDbContext db, IConfiguration config) : ControllerBase
{
    // ─── Auth ────────────────────────────────────────────────────────────────

    [HttpPost("login")]
    public IActionResult Login([FromBody] SuperAdminLoginRequest req)
    {
        var username = config["SuperAdmin:Username"];
        var password = config["SuperAdmin:Password"];

        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            return StatusCode(503, "SuperAdmin kullanıcısı yapılandırılmamış.");

        if (req.Username != username || req.Password != password)
            return Unauthorized("Kullanıcı adı veya şifre hatalı.");

        var token = GenerateToken();
        return Ok(new { token });
    }

    string GenerateToken()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[] { new Claim(ClaimTypes.Role, "SuperAdmin") };
        var jwt = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    bool IsSuperAdmin() => User.FindFirstValue(ClaimTypes.Role) == "SuperAdmin";

    // ─── Siteler ─────────────────────────────────────────────────────────────

    [HttpGet("sites")]
    public async Task<IActionResult> ListSites()
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var sites = await db.Sites
            .Select(s => new {
                s.Id, s.Name, s.Address, s.Phone, s.Email, s.IsActive, s.Tier, s.CreatedAt,
                ApartmentCount = db.Apartments.Count(a => a.SiteId == s.Id),
                UserCount = db.Users.Count(u => u.SiteId == s.Id),
                Admins = db.Users
                    .Where(u => u.SiteId == s.Id && u.Role == UserRole.SiteAdmin)
                    .Select(u => new { u.Id, u.FullName, u.Email, u.Phone, u.IsActive })
                    .ToList()
            })
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return Ok(sites);
    }

    [HttpGet("sites/{siteId}/users")]
    public async Task<IActionResult> ListUsers(int siteId)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var users = await db.Users
            .Where(u => u.SiteId == siteId)
            .Select(u => new { u.Id, u.FullName, u.Email, u.Phone, u.Role, u.IsActive, u.CreatedAt })
            .OrderBy(u => u.Role).ThenBy(u => u.FullName)
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("sites/{siteId}/users/{userId}/role")]
    public async Task<IActionResult> ChangeRole(int siteId, int userId, [FromBody] SuperAdminRoleRequest req)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.SiteId == siteId);
        if (user is null) return NotFound();

        user.Role = req.Role;
        user.IsActive = true;
        await db.SaveChangesAsync();
        return Ok(new { message = $"{user.FullName} rolü güncellendi." });
    }

    [HttpPost("sites/{siteId}/users/{userId}/reset-password")]
    public async Task<IActionResult> ResetPassword(int siteId, int userId, [FromBody] SuperAdminPasswordRequest req)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.SiteId == siteId);
        if (user is null) return NotFound();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.IsActive = true;
        await db.SaveChangesAsync();
        return Ok(new { message = $"{user.FullName} şifresi sıfırlandı." });
    }

    [HttpPut("sites/{siteId}/status")]
    public async Task<IActionResult> SetSiteStatus(int siteId, [FromBody] SuperAdminStatusRequest req)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var site = await db.Sites.FindAsync(siteId);
        if (site is null) return NotFound();

        site.IsActive = req.IsActive;
        await db.SaveChangesAsync();
        return Ok(new { message = $"Site {(req.IsActive ? "aktif" : "pasif")} yapıldı." });
    }

    // Plan tier'ı manuel değiştir
    [HttpPut("sites/{siteId}/tier")]
    public async Task<IActionResult> SetTier(int siteId, [FromBody] SuperAdminTierRequest req)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var site = await db.Sites.FindAsync(siteId);
        if (site is null) return NotFound();

        site.Tier = req.Tier;
        await db.SaveChangesAsync();
        return Ok(new { message = $"Plan {req.Tier} olarak güncellendi." });
    }

    // ─── Plan Ödemeleri ──────────────────────────────────────────────────────

    [HttpGet("plan-payments")]
    public async Task<IActionResult> ListPlanPayments([FromQuery] int? year, [FromQuery] bool? unpaidOnly)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var now = DateTime.UtcNow;
        var q = db.PlanPayments.Include(p => p.Site).AsQueryable();

        if (year.HasValue) q = q.Where(p => p.Year == year.Value);
        if (unpaidOnly == true) q = q.Where(p => !p.IsPaid);

        var payments = await q.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).ToListAsync();
        return Ok(payments.Select(MapPlanPayment));
    }

    // Bir site için aylık plan ödemesi oluştur
    [HttpPost("sites/{siteId}/plan-payments")]
    public async Task<IActionResult> CreatePlanPayment(int siteId, [FromBody] CreatePlanPaymentRequest req)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var site = await db.Sites.FindAsync(siteId);
        if (site is null) return NotFound();

        var existing = await db.PlanPayments
            .FirstOrDefaultAsync(p => p.SiteId == siteId && p.Year == req.Year && p.Month == req.Month);

        if (existing is not null) return BadRequest("Bu dönem için zaten kayıt var.");

        var pp = new PlanPayment
        {
            SiteId = siteId,
            Tier = req.Tier,
            Amount = req.Amount,
            Year = req.Year,
            Month = req.Month,
            IsPaid = req.IsPaid,
            PaidAt = req.IsPaid ? DateTime.UtcNow : null,
            Notes = req.Notes
        };
        db.PlanPayments.Add(pp);
        await db.SaveChangesAsync();
        return Ok(MapPlanPayment(pp));
    }

    // Ödeme alındı olarak işaretle
    [HttpPut("plan-payments/{id}/mark-paid")]
    public async Task<IActionResult> MarkPaid(int id, [FromBody] MarkPlanPaidRequest req)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var pp = await db.PlanPayments.FindAsync(id);
        if (pp is null) return NotFound();

        pp.IsPaid = true;
        pp.PaidAt = DateTime.UtcNow;
        pp.Notes = req.Notes ?? pp.Notes;
        await db.SaveChangesAsync();
        return Ok(MapPlanPayment(pp));
    }

    // Ödeme iptal et
    [HttpPut("plan-payments/{id}/mark-unpaid")]
    public async Task<IActionResult> MarkUnpaid(int id)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var pp = await db.PlanPayments.FindAsync(id);
        if (pp is null) return NotFound();

        pp.IsPaid = false;
        pp.PaidAt = null;
        await db.SaveChangesAsync();
        return Ok(MapPlanPayment(pp));
    }

    [HttpDelete("plan-payments/{id}")]
    public async Task<IActionResult> DeletePlanPayment(int id)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var pp = await db.PlanPayments.FindAsync(id);
        if (pp is null) return NotFound();
        db.PlanPayments.Remove(pp);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Tüm aktif ücretli sitelere bu ay ödeme kaydı oluştur
    [HttpPost("plan-payments/generate-monthly")]
    public async Task<IActionResult> GenerateMonthly([FromBody] GenerateMonthlyRequest req)
    {
        if (!IsSuperAdmin()) return Unauthorized();

        var paidTiers = new[] { SubscriptionTier.Starter, SubscriptionTier.Professional };
        var sites = await db.Sites
            .Where(s => s.IsActive && paidTiers.Contains(s.Tier))
            .ToListAsync();

        int created = 0;
        foreach (var site in sites)
        {
            var exists = await db.PlanPayments.AnyAsync(p =>
                p.SiteId == site.Id && p.Year == req.Year && p.Month == req.Month);
            if (exists) continue;

            db.PlanPayments.Add(new PlanPayment
            {
                SiteId = site.Id,
                Tier = site.Tier,
                Amount = SubscriptionService.GetMonthlyPrice(site.Tier),
                Year = req.Year,
                Month = req.Month,
                IsPaid = false
            });
            created++;
        }
        await db.SaveChangesAsync();
        return Ok(new { message = $"{created} yeni ödeme kaydı oluşturuldu." });
    }

    static object MapPlanPayment(PlanPayment p) => new
    {
        p.Id, p.SiteId,
        SiteName = p.Site?.Name ?? "",
        Tier = p.Tier.ToString(),
        p.Amount, p.Year, p.Month,
        p.IsPaid, p.PaidAt, p.Notes, p.CreatedAt
    };
}

public record SuperAdminLoginRequest(string Username, string Password);
public record SuperAdminRoleRequest(UserRole Role);
public record SuperAdminPasswordRequest(string NewPassword);
public record SuperAdminStatusRequest(bool IsActive);
public record SuperAdminTierRequest(SubscriptionTier Tier);
public record CreatePlanPaymentRequest(SubscriptionTier Tier, decimal Amount, int Year, int Month, bool IsPaid, string? Notes);
public record MarkPlanPaidRequest(string? Notes);
public record GenerateMonthlyRequest(int Year, int Month);
