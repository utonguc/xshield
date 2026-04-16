using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.DTOs;
using ClinicPlatform.Api.Models;
using ClinicPlatform.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]   // Tüm yetkili kullanıcılar erişebilir
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;

    public ReportsController(AppDbContext db, IEmailService email)
    {
        _db    = db;
        _email = email;
    }

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var clinicId = await _db.Users.Where(x => x.Id == userId)
            .Select(x => (Guid?)x.ClinicId).FirstOrDefaultAsync();
        return clinicId is null ? null : (userId, clinicId.Value);
    }

    // GET api/reports/summary
    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var now      = DateTime.UtcNow;
        var next7    = now.AddDays(7);
        var thisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalPatients      = await _db.Patients.CountAsync(x => x.ClinicId == clinicId);
        var totalDoctors       = await _db.Doctors.CountAsync(x => x.ClinicId == clinicId && x.IsActive);
        var totalAppointments  = await _db.Appointments.CountAsync(x => x.ClinicId == clinicId);
        var thisMonthAppts     = await _db.Appointments.CountAsync(x => x.ClinicId == clinicId && x.StartAtUtc >= thisMonth);

        var leadFunnel = await _db.Patients
            .Where(x => x.ClinicId == clinicId)
            .GroupBy(x => x.LeadStatus)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        var upcomingByDoctor = await _db.Appointments
            .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now && x.StartAtUtc <= next7)
            .GroupBy(x => x.Doctor!.FullName)
            .Select(g => new { doctor = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var latestAppointments = await _db.Appointments
            .Where(x => x.ClinicId == clinicId)
            .OrderByDescending(x => x.StartAtUtc)
            .Take(10)
            .Select(x => new
            {
                x.Id,
                Patient       = x.Patient!.FirstName + " " + x.Patient.LastName,
                Doctor        = x.Doctor!.FullName,
                x.ProcedureName,
                x.StartAtUtc,
                x.EndAtUtc,
                x.Status
            })
            .ToListAsync();

        var monthlyTrend = await _db.Appointments
            .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now.AddMonths(-6))
            .GroupBy(x => new { x.StartAtUtc.Year, x.StartAtUtc.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync();

        return Ok(new
        {
            totalPatients,
            totalDoctors,
            totalAppointments,
            thisMonthAppointments = thisMonthAppts,
            leadFunnel,
            upcomingByDoctor,
            latestAppointments,
            monthlyTrend
        });
    }

    // GET api/reports/financial?months=6
    [HttpGet("financial")]
    public async Task<IActionResult> Financial([FromQuery] int months = 6)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        months = Math.Clamp(months, 1, 24);
        var since    = DateTime.UtcNow.AddMonths(-months);
        var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Monthly revenue (paid invoices)
        var monthlyRevenue = await _db.Invoices
            .Where(x => x.ClinicId == clinicId && (x.Status == "Paid") && x.IssuedAtUtc >= since)
            .GroupBy(x => new { x.IssuedAtUtc.Year, x.IssuedAtUtc.Month })
            .Select(g => new { year = g.Key.Year, month = g.Key.Month, total = g.Sum(i => i.Total), count = g.Count() })
            .OrderBy(x => x.year).ThenBy(x => x.month)
            .ToListAsync();

        // Invoice status breakdown
        var statusBreakdown = await _db.Invoices
            .Where(x => x.ClinicId == clinicId)
            .GroupBy(x => x.Status)
            .Select(g => new { status = g.Key, count = g.Count(), total = g.Sum(i => i.Total) })
            .ToListAsync();

        // Top 10 procedures by revenue
        var topProcedures = await _db.Appointments
            .Where(x => x.ClinicId == clinicId && x.Status == "Completed" && x.StartAtUtc >= since)
            .GroupBy(x => x.ProcedureName)
            .Select(g => new { procedure = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToListAsync();

        // This month vs last month
        var lastMonth = thisMonth.AddMonths(-1);
        var thisMonthRevenue = await _db.Invoices
            .Where(x => x.ClinicId == clinicId && x.Status == "Paid" && x.IssuedAtUtc >= thisMonth)
            .SumAsync(x => (decimal?)x.Total) ?? 0;
        var lastMonthRevenue = await _db.Invoices
            .Where(x => x.ClinicId == clinicId && x.Status == "Paid" && x.IssuedAtUtc >= lastMonth && x.IssuedAtUtc < thisMonth)
            .SumAsync(x => (decimal?)x.Total) ?? 0;

        var totalReceivable = await _db.Invoices
            .Where(x => x.ClinicId == clinicId && (x.Status == "Sent" || x.Status == "Overdue"))
            .SumAsync(x => (decimal?)x.Total) ?? 0;

        var totalRevenue = await _db.Invoices
            .Where(x => x.ClinicId == clinicId && x.Status == "Paid")
            .SumAsync(x => (decimal?)x.Total) ?? 0;

        return Ok(new
        {
            totalRevenue,
            thisMonthRevenue,
            lastMonthRevenue,
            totalReceivable,
            monthlyRevenue,
            statusBreakdown,
            topProcedures,
        });
    }

    // GET api/reports/patients-analytics
    [HttpGet("patients-analytics")]
    public async Task<IActionResult> PatientsAnalytics()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var now   = DateTime.UtcNow;
        var since = now.AddMonths(-6);

        // Monthly new patients
        var monthlyNew = await _db.Patients
            .Where(x => x.ClinicId == clinicId && x.CreatedAtUtc >= since)
            .GroupBy(x => new { x.CreatedAtUtc.Year, x.CreatedAtUtc.Month })
            .Select(g => new { year = g.Key.Year, month = g.Key.Month, count = g.Count() })
            .OrderBy(x => x.year).ThenBy(x => x.month)
            .ToListAsync();

        // Lead source breakdown
        var bySource = await _db.Patients
            .Where(x => x.ClinicId == clinicId && x.LeadSource != null)
            .GroupBy(x => x.LeadSource!)
            .Select(g => new { source = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(8)
            .ToListAsync();

        // Gender breakdown
        var byGender = await _db.Patients
            .Where(x => x.ClinicId == clinicId && x.Gender != null)
            .GroupBy(x => x.Gender!)
            .Select(g => new { gender = g.Key, count = g.Count() })
            .ToListAsync();

        // Top cities
        var byCity = await _db.Patients
            .Where(x => x.ClinicId == clinicId && x.City != null)
            .GroupBy(x => x.City!)
            .Select(g => new { city = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(6)
            .ToListAsync();

        // Top interested procedures
        var byProcedure = await _db.Patients
            .Where(x => x.ClinicId == clinicId && x.InterestedProcedure != null)
            .GroupBy(x => x.InterestedProcedure!)
            .Select(g => new { procedure = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(8)
            .ToListAsync();

        return Ok(new { monthlyNew, bySource, byGender, byCity, byProcedure });
    }

    // ── Scheduled Reports ─────────────────────────────────────────────────────

    // GET api/reports/scheduled
    [HttpGet("scheduled")]
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    public async Task<IActionResult> GetScheduled()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var items = await _db.ScheduledReports
            .Where(x => x.ClinicId == clinicId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ScheduledReportResponse
            {
                Id               = x.Id,
                Name             = x.Name,
                ReportType       = x.ReportType,
                ReportTypeLabel  = ReportTypes.Labels.GetValueOrDefault(x.ReportType, x.ReportType),
                Frequency        = x.Frequency,
                RecipientEmails  = x.RecipientEmails,
                IsActive         = x.IsActive,
                LastSentAtUtc    = x.LastSentAtUtc,
                NextRunAtUtc     = x.NextRunAtUtc,
                CreatedAtUtc     = x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(items);
    }

    // POST api/reports/scheduled
    [HttpPost("scheduled")]
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    public async Task<IActionResult> CreateScheduled([FromBody] CreateScheduledReportRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId) = ctx.Value;

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Rapor adı zorunlu." });

        if (!ReportTypes.Labels.ContainsKey(req.ReportType))
            return BadRequest(new { message = "Geçersiz rapor türü." });

        if (!new[] { ReportFrequency.Daily, ReportFrequency.Weekly, ReportFrequency.Monthly }.Contains(req.Frequency))
            return BadRequest(new { message = "Geçersiz frekans. daily | weekly | monthly" });

        var nextRun = req.Frequency switch
        {
            ReportFrequency.Daily   => DateTime.UtcNow.AddDays(1).Date,
            ReportFrequency.Weekly  => DateTime.UtcNow.AddDays(7).Date,
            ReportFrequency.Monthly => DateTime.UtcNow.AddMonths(1).Date,
            _                       => DateTime.UtcNow.AddDays(7).Date
        };

        var report = new ScheduledReport
        {
            ClinicId         = clinicId,
            CreatedByUserId  = userId,
            Name             = req.Name.Trim(),
            ReportType       = req.ReportType,
            Frequency        = req.Frequency,
            RecipientEmails  = req.RecipientEmails?.Trim(),
            IsActive         = true,
            NextRunAtUtc     = nextRun
        };

        _db.ScheduledReports.Add(report);
        await _db.SaveChangesAsync();
        return Ok(report.Id);
    }

    // PATCH api/reports/scheduled/{id}/toggle
    [HttpPatch("scheduled/{id:guid}/toggle")]
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    public async Task<IActionResult> ToggleScheduled(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var report = await _db.ScheduledReports
            .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId);
        if (report is null) return NotFound(new { message = "Rapor bulunamadı." });

        report.IsActive = !report.IsActive;
        await _db.SaveChangesAsync();
        return Ok(new { id = report.Id, isActive = report.IsActive });
    }

    // DELETE api/reports/scheduled/{id}
    [HttpDelete("scheduled/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    public async Task<IActionResult> DeleteScheduled(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var report = await _db.ScheduledReports
            .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId);
        if (report is null) return NotFound(new { message = "Rapor bulunamadı." });

        _db.ScheduledReports.Remove(report);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST api/reports/scheduled/{id}/send-now  — anında gönder
    [HttpPost("scheduled/{id:guid}/send-now")]
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    public async Task<IActionResult> SendNow(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var report = await _db.ScheduledReports
            .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId);
        if (report is null) return NotFound(new { message = "Rapor bulunamadı." });

        var (subject, html) = await ReportBuilder.BuildAsync(_db, clinicId, report.ReportType, report.Name);
        var emails = (report.RecipientEmails ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        if (emails.Count == 0)
            return BadRequest(new { message = "Alıcı e-posta adresi tanımlı değil." });

        await _email.SendAsync(emails, subject, html);

        report.LastSentAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Rapor {emails.Count} alıcıya gönderildi." });
    }

    // GET api/reports/report-types  — frontend için sabit listeler
    [HttpGet("report-types")]
    public IActionResult GetReportTypes() =>
        Ok(ReportTypes.Labels.Select(kv => new { code = kv.Key, label = kv.Value }));
}
