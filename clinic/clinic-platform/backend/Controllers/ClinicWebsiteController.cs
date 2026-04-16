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
public class ClinicWebsiteController : ControllerBase
{
    private readonly AppDbContext _db;
    public ClinicWebsiteController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetCtxAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        return user is null ? null : (user.Id, user.ClinicId);
    }

    // GET api/clinicwebsite  — current clinic's website
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Get()
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var w = await _db.ClinicWebsites.FirstOrDefaultAsync(x => x.ClinicId == clinicId);
        if (w is null)
        {
            var clinic = await _db.Clinics.FirstOrDefaultAsync(x => x.Id == clinicId);
            return Ok(new ClinicWebsiteResponse
            {
                Slug          = SlugFrom(clinic?.Name ?? "klinik"),
                PrimaryColor  = "#1d4ed8",
                Theme         = "modern",
                ShowReviews   = true,
                BookingEnabled = true,
            });
        }

        return Ok(MapResponse(w));
    }

    // PUT api/clinicwebsite
    [HttpPut]
    [Authorize]
    public async Task<IActionResult> Save([FromBody] SaveClinicWebsiteRequest req)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        if (string.IsNullOrWhiteSpace(req.Slug))
            return BadRequest(new { message = "Slug zorunlu." });

        req.Slug = req.Slug.Trim().ToLowerInvariant().Replace(" ", "-");

        // Slug uniqueness (allow same clinic to keep their slug)
        var conflict = await _db.ClinicWebsites.AnyAsync(x => x.Slug == req.Slug && x.ClinicId != clinicId);
        if (conflict)
            return Conflict(new { message = "Bu slug başka bir klinik tarafından kullanılıyor." });

        var w = await _db.ClinicWebsites.FirstOrDefaultAsync(x => x.ClinicId == clinicId);
        if (w is null)
        {
            w = new ClinicWebsite { ClinicId = clinicId };
            _db.ClinicWebsites.Add(w);
        }

        Apply(w, req);
        w.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Web sitesi kaydedildi.", slug = w.Slug });
    }

    // PATCH api/clinicwebsite/publish
    [HttpPatch("publish")]
    [Authorize]
    public async Task<IActionResult> TogglePublish()
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var w = await _db.ClinicWebsites.FirstOrDefaultAsync(x => x.ClinicId == ctx.Value.clinicId);
        if (w is null) return NotFound(new { message = "Önce web sitesini kaydedin." });

        w.IsPublished = !w.IsPublished;
        await _db.SaveChangesAsync();
        return Ok(new { isPublished = w.IsPublished });
    }

    // ── Public endpoints (no auth) ────────────────────────────────────────────

    // GET api/clinicwebsite/public/{slug}
    [HttpGet("public/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublic(string slug)
    {
        var w = await _db.ClinicWebsites
            .Include(x => x.Clinic)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished);

        if (w is null) return NotFound(new { message = "Klinik bulunamadı." });

        var doctors = await _db.Doctors
            .Where(x => x.ClinicId == w.ClinicId && x.IsActive)
            .OrderBy(x => x.FullName)
            .ToListAsync();

        // Average ratings from surveys
        var surveyResponses = await _db.SurveyResponses
            .Where(r => _db.Surveys.Any(s => s.ClinicId == w.ClinicId && s.Id == r.SurveyId))
            .Include(r => r.Answers)
            .ToListAsync();

        var publicDoctors = doctors.Select(d =>
        {
            // Simple clinic-wide rating (we don't have per-doctor rating yet)
            var ratings = surveyResponses
                .SelectMany(r => r.Answers)
                .Where(a => _db.SurveyQuestions.Any(q => q.Id == a.QuestionId && q.Type == "rating")
                         && int.TryParse(a.Value, out _))
                .Select(a => (double)int.Parse(a.Value!))
                .ToList();

            return new PublicDoctorResponse
            {
                Id              = d.Id,
                FullName        = d.FullName,
                Branch          = d.Branch,
                Biography       = d.Biography,
                PhotoUrl        = d.PhotoUrl,
                Specializations = d.Specializations,
                ExperienceYears = d.ExperienceYears,
                AvgRating       = ratings.Count > 0 ? Math.Round(ratings.Average(), 1) : null,
                ReviewCount     = surveyResponses.Count,
            };
        }).ToList();

        return Ok(new PublicClinicResponse
        {
            Name           = w.Clinic?.Name ?? "",
            Slug           = w.Slug,
            HeroTitle      = w.HeroTitle,
            HeroSubtitle   = w.HeroSubtitle,
            HeroImageUrl   = w.HeroImageUrl,
            AboutText      = w.AboutText,
            Address        = w.Address,
            Phone          = w.Phone,
            Email          = w.Email,
            GoogleMapsUrl  = w.GoogleMapsUrl,
            InstagramUrl   = w.InstagramUrl,
            FacebookUrl    = w.FacebookUrl,
            WhatsAppNumber = w.WhatsAppNumber,
            PrimaryColor   = w.PrimaryColor,
            Theme          = w.Theme,
            ShowPrices     = w.ShowPrices,
            ShowReviews    = w.ShowReviews,
            BookingEnabled = w.BookingEnabled,
            Doctors        = publicDoctors,
        });
    }

    // GET api/clinicwebsite/by-slug/{slug}  — lightweight, for portal login page
    [HttpGet("by-slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var w = await _db.ClinicWebsites
            .Include(x => x.Clinic)
            .FirstOrDefaultAsync(x => x.Slug == slug);

        if (w is null) return NotFound(new { message = "Klinik bulunamadı." });

        var settings = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.ClinicId == w.ClinicId);

        return Ok(new
        {
            clinicId     = w.ClinicId,
            clinicName   = w.Clinic?.Name ?? "",
            slug         = w.Slug,
            primaryColor = w.PrimaryColor ?? settings?.PrimaryColor ?? "#1d4ed8",
        });
    }

    // GET api/clinicwebsite/public/{slug}/doctors/{doctorId}/slots?date=2026-04-10
    [HttpGet("public/{slug}/doctors/{doctorId:guid}/slots")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicSlots(string slug, Guid doctorId, [FromQuery] string date, [FromQuery] int tzOffsetMinutes = 180)
    {
        var w = await _db.ClinicWebsites.FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished);
        if (w is null) return NotFound();

        if (!DateTime.TryParse(date, out var localDay))
            return BadRequest(new { message = "Geçersiz tarih." });

        var dayOfWeek = (int)localDay.DayOfWeek;
        var day = DateTime.SpecifyKind(localDay.Date, DateTimeKind.Utc).AddMinutes(-tzOffsetMinutes);

        var schedule = await _db.DoctorSchedules
            .FirstOrDefaultAsync(x => x.DoctorId == doctorId && x.ClinicId == w.ClinicId && x.DayOfWeek == dayOfWeek && x.IsActive);

        if (schedule is null) return Ok(new List<TimeSlotResponse>());

        var dayEnd = day.AddDays(1);
        var booked = await _db.Appointments
            .Where(x => x.DoctorId == doctorId && x.StartAtUtc >= day && x.StartAtUtc < dayEnd && x.Status != "Cancelled")
            .Select(x => new { x.StartAtUtc, x.EndAtUtc }).ToListAsync();

        var pending = await _db.AppointmentRequests
            .Where(x => x.DoctorId == doctorId && x.RequestedStartUtc >= day && x.RequestedStartUtc < dayEnd && x.Status == "Pending")
            .Select(x => new { StartAtUtc = x.RequestedStartUtc, EndAtUtc = x.RequestedEndUtc }).ToListAsync();

        var leaves = await _db.DoctorLeaves
            .Where(x => x.DoctorId == doctorId && x.StartAtUtc < dayEnd && x.EndAtUtc > day).ToListAsync();

        var slots = new List<TimeSlotResponse>();
        var cur   = day.Add(schedule.StartTime);
        var end   = day.Add(schedule.EndTime);

        while (cur.Add(TimeSpan.FromMinutes(schedule.SlotMinutes)) <= end)
        {
            var next = cur.Add(TimeSpan.FromMinutes(schedule.SlotMinutes));
            bool busy = leaves.Any(l => l.StartAtUtc < next && l.EndAtUtc > cur)
                     || booked.Any(a => a.StartAtUtc < next && a.EndAtUtc > cur)
                     || pending.Any(a => a.StartAtUtc < next && a.EndAtUtc > cur)
                     || cur <= DateTime.UtcNow.AddMinutes(30);

            slots.Add(new TimeSlotResponse { StartUtc = cur, EndUtc = next, Available = !busy });
            cur = next;
        }

        return Ok(slots);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string SlugFrom(string name) =>
        System.Text.RegularExpressions.Regex.Replace(
            name.ToLowerInvariant().Replace(" ", "-"), @"[^a-z0-9\-]", "");

    private static ClinicWebsiteResponse MapResponse(ClinicWebsite w) => new()
    {
        Id             = w.Id,
        Slug           = w.Slug,
        CustomDomain   = w.CustomDomain,
        IsPublished    = w.IsPublished,
        HeroTitle      = w.HeroTitle,
        HeroSubtitle   = w.HeroSubtitle,
        HeroImageUrl   = w.HeroImageUrl,
        AboutText      = w.AboutText,
        Address        = w.Address,
        Phone          = w.Phone,
        Email          = w.Email,
        GoogleMapsUrl  = w.GoogleMapsUrl,
        InstagramUrl   = w.InstagramUrl,
        FacebookUrl    = w.FacebookUrl,
        WhatsAppNumber = w.WhatsAppNumber,
        PrimaryColor   = w.PrimaryColor,
        Theme          = w.Theme,
        MetaTitle      = w.MetaTitle,
        MetaDescription = w.MetaDescription,
        MetaKeywords   = w.MetaKeywords,
        ShowPrices        = w.ShowPrices,
        ShowReviews       = w.ShowReviews,
        BookingEnabled    = w.BookingEnabled,
        ListedInDirectory = w.ListedInDirectory,
    };

    private static void Apply(ClinicWebsite w, SaveClinicWebsiteRequest r)
    {
        w.Slug           = r.Slug;
        w.CustomDomain   = r.CustomDomain;
        w.IsPublished    = r.IsPublished;
        w.HeroTitle      = r.HeroTitle;
        w.HeroSubtitle   = r.HeroSubtitle;
        w.HeroImageUrl   = r.HeroImageUrl;
        w.AboutText      = r.AboutText;
        w.Address        = r.Address;
        w.Phone          = r.Phone;
        w.Email          = r.Email;
        w.GoogleMapsUrl  = r.GoogleMapsUrl;
        w.InstagramUrl   = r.InstagramUrl;
        w.FacebookUrl    = r.FacebookUrl;
        w.WhatsAppNumber = r.WhatsAppNumber;
        w.PrimaryColor   = r.PrimaryColor;
        w.Theme          = r.Theme;
        w.MetaTitle      = r.MetaTitle;
        w.MetaDescription = r.MetaDescription;
        w.MetaKeywords   = r.MetaKeywords;
        w.ShowPrices        = r.ShowPrices;
        w.ShowReviews       = r.ShowReviews;
        w.BookingEnabled    = r.BookingEnabled;
        w.ListedInDirectory = r.ListedInDirectory;
    }
}
