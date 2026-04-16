using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClinicPlatform.Api.Data;

namespace ClinicPlatform.Api.Controllers;

/// <summary>
/// Public endpoints — no authentication required.
/// Used by the landing page clinic directory.
/// </summary>
[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicController(AppDbContext db) => _db = db;

    // GET api/public/clinics?q=&city=&branch=&page=1&pageSize=12
    [HttpGet("clinics")]
    public async Task<IActionResult> GetClinics(
        [FromQuery] string? q,
        [FromQuery] string? city,
        [FromQuery] string? branch,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 12)
    {
        pageSize = Math.Clamp(pageSize, 1, 48);
        page     = Math.Max(1, page);

        // Base query: only published websites belonging to active clinics
        var query = _db.ClinicWebsites
            .Where(w => w.IsPublished && w.ListedInDirectory && w.Clinic != null && w.Clinic.IsActive)
            .Include(w => w.Clinic)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var ql = q.Trim().ToLower();
            query = query.Where(w =>
                w.Clinic!.Name.ToLower().Contains(ql) ||
                (w.Address != null && w.Address.ToLower().Contains(ql)) ||
                (w.Clinic.City != null && w.Clinic.City.ToLower().Contains(ql)));
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            var cl = city.Trim().ToLower();
            query = query.Where(w =>
                w.Clinic!.City != null && w.Clinic.City.ToLower().Contains(cl));
        }

        var total   = await query.CountAsync();
        var websites = await query
            .OrderByDescending(w => w.Clinic!.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Fetch org settings + doctor branches for the matched clinics
        var clinicIds = websites.Select(w => w.ClinicId).ToList();

        var orgSettings = await _db.OrganizationSettings
            .Where(o => clinicIds.Contains(o.ClinicId))
            .ToDictionaryAsync(o => o.ClinicId);

        var doctorBranches = await _db.Doctors
            .Where(d => clinicIds.Contains(d.ClinicId) && d.IsActive && d.Branch != null)
            .GroupBy(d => d.ClinicId)
            .Select(g => new { ClinicId = g.Key, Branches = g.Select(d => d.Branch!).Distinct().ToList() })
            .ToListAsync();

        var branchMap = doctorBranches.ToDictionary(x => x.ClinicId, x => x.Branches);

        // Filter by branch (done in memory after fetching branches)
        var results = websites.Select(w =>
        {
            var org     = orgSettings.GetValueOrDefault(w.ClinicId);
            var branches = branchMap.GetValueOrDefault(w.ClinicId, new List<string>());
            return new
            {
                slug         = w.Slug,
                name         = w.Clinic?.Name ?? "",
                city         = w.Clinic?.City ?? "",
                address      = w.Address ?? "",
                phone        = w.Phone ?? "",
                email        = w.Email ?? "",
                logoUrl      = org?.LogoUrl,
                primaryColor = w.PrimaryColor,
                branches,
                bookingEnabled = w.BookingEnabled,
                heroTitle    = w.HeroTitle,
                aboutText    = w.AboutText,
                instagramUrl = w.InstagramUrl,
                whatsAppNumber = w.WhatsAppNumber,
            };
        });

        // Branch filter (in-memory since branches come from a subquery)
        if (!string.IsNullOrWhiteSpace(branch))
        {
            var bl = branch.Trim().ToLower();
            results = results.Where(r =>
                r.branches.Any(b => b.ToLower().Contains(bl)));
        }

        var list = results.ToList();

        return Ok(new
        {
            total,
            page,
            pageSize,
            items = list,
        });
    }

    // GET api/public/clinics/cities — distinct cities for filter dropdown
    [HttpGet("clinics/cities")]
    public async Task<IActionResult> GetCities()
    {
        var cities = await _db.ClinicWebsites
            .Where(w => w.IsPublished && w.ListedInDirectory && w.Clinic != null && w.Clinic.IsActive && w.Clinic.City != null)
            .Select(w => w.Clinic!.City!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return Ok(cities);
    }

    // GET api/public/clinics/branches — distinct branches for filter
    [HttpGet("clinics/branches")]
    public async Task<IActionResult> GetBranches()
    {
        var publishedClinicIds = await _db.ClinicWebsites
            .Where(w => w.IsPublished && w.ListedInDirectory && w.Clinic != null && w.Clinic.IsActive)
            .Select(w => w.ClinicId)
            .ToListAsync();

        var branches = await _db.Doctors
            .Where(d => publishedClinicIds.Contains(d.ClinicId) && d.IsActive && d.Branch != null)
            .Select(d => d.Branch!)
            .Distinct()
            .OrderBy(b => b)
            .ToListAsync();

        return Ok(branches);
    }
}
