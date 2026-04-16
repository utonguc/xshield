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
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId, string? role)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;

        var user = await _db.Users.Include(x => x.Role)
            .FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;

        return (user.Id, user.ClinicId, user.Role?.Name);
    }

    // GET api/dashboard/widgets
    [HttpGet("widgets")]
    public async Task<IActionResult> GetWidgets()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId, role) = ctx.Value;

        var widgets = await _db.DashboardWidgets
            .Where(x => x.ClinicId == clinicId && x.UserId == userId)
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        // İlk girişte rol şablonunu oluştur
        if (widgets.Count == 0 && role is not null)
        {
            widgets = await SeedDefaultWidgetsAsync(userId, clinicId, role);
        }

        var result = widgets.Select(w => new DashboardWidgetResponse
        {
            Id         = w.Id,
            WidgetType = w.WidgetType,
            Label      = WidgetTypes.Labels.GetValueOrDefault(w.WidgetType, w.WidgetType),
            SortOrder  = w.SortOrder,
            Size       = w.Size,
            Config     = w.Config
        });

        return Ok(result);
    }

    // GET api/dashboard/available-widgets  — kütüphane listesi
    [HttpGet("available-widgets")]
    public IActionResult GetAvailableWidgets()
    {
        var all = WidgetTypes.Labels.Select(kv => new
        {
            widgetType = kv.Key,
            label      = kv.Value
        });
        return Ok(all);
    }

    // POST api/dashboard/widgets  — tüm widget listesini kaydet (replace)
    [HttpPost("widgets")]
    public async Task<IActionResult> SaveWidgets([FromBody] SaveDashboardRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId, _) = ctx.Value;

        // Eskilerini sil
        var existing = await _db.DashboardWidgets
            .Where(x => x.ClinicId == clinicId && x.UserId == userId)
            .ToListAsync();
        _db.DashboardWidgets.RemoveRange(existing);

        // Yenilerini ekle
        var newWidgets = req.Widgets.Select((w, i) => new DashboardWidget
        {
            ClinicId   = clinicId,
            UserId     = userId,
            WidgetType = w.WidgetType,
            SortOrder  = w.SortOrder > 0 ? w.SortOrder : i,
            Size       = w.Size,
            Config     = w.Config
        }).ToList();

        _db.DashboardWidgets.AddRange(newWidgets);
        await _db.SaveChangesAsync();

        return Ok(new { count = newWidgets.Count });
    }

    // POST api/dashboard/reset  — rol şablonuna sıfırla
    [HttpPost("reset")]
    public async Task<IActionResult> ResetToDefault()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId, role) = ctx.Value;

        var existing = await _db.DashboardWidgets
            .Where(x => x.ClinicId == clinicId && x.UserId == userId)
            .ToListAsync();
        _db.DashboardWidgets.RemoveRange(existing);
        await _db.SaveChangesAsync();

        var seeded = await SeedDefaultWidgetsAsync(userId, clinicId, role ?? "Resepsiyon");
        return Ok(new { count = seeded.Count });
    }

    // GET api/dashboard/data/{widgetType}  — widget veri endpoint'i
    [HttpGet("data/{widgetType}")]
    public async Task<IActionResult> GetWidgetData(string widgetType)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, _) = ctx.Value;

        var now            = DateTime.UtcNow;
        var monthStart     = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = monthStart.AddMonths(-1);

        static int CalcTrend(int thisMonth, int lastMonth)
            => lastMonth == 0 ? (thisMonth > 0 ? 100 : 0)
                              : (int)Math.Round((thisMonth - lastMonth) * 100.0 / lastMonth);

        switch (widgetType)
        {
            case WidgetTypes.KpiPatients:
            {
                var total     = await _db.Patients.CountAsync(x => x.ClinicId == clinicId);
                var thisMonth = await _db.Patients.CountAsync(x => x.ClinicId == clinicId && x.CreatedAtUtc >= monthStart);
                var lastMonth = await _db.Patients.CountAsync(x => x.ClinicId == clinicId && x.CreatedAtUtc >= lastMonthStart && x.CreatedAtUtc < monthStart);
                return Ok(new { value = total, label = "Toplam Hasta", thisMonth, lastMonth, trendPct = CalcTrend(thisMonth, lastMonth) });
            }

            case WidgetTypes.KpiDoctors:
                return Ok(new
                {
                    value = await _db.Doctors.CountAsync(x => x.ClinicId == clinicId && x.IsActive),
                    label = "Aktif Doktor", thisMonth = 0, lastMonth = 0, trendPct = 0
                });

            case WidgetTypes.KpiAppointments:
            {
                var total     = await _db.Appointments.CountAsync(x => x.ClinicId == clinicId);
                var thisMonth = await _db.Appointments.CountAsync(x => x.ClinicId == clinicId && x.StartAtUtc >= monthStart);
                var lastMonth = await _db.Appointments.CountAsync(x => x.ClinicId == clinicId && x.StartAtUtc >= lastMonthStart && x.StartAtUtc < monthStart);
                return Ok(new { value = total, label = "Toplam Randevu", thisMonth, lastMonth, trendPct = CalcTrend(thisMonth, lastMonth) });
            }

            case WidgetTypes.KpiSatisfaction:
                return Ok(new { value = "4.8 / 5", label = "Hasta Memnuniyeti", thisMonth = 0, lastMonth = 0, trendPct = 0, note = "Anket modülü ile entegre edilebilir" });

            case WidgetTypes.CalendarUpcoming:
                return Ok(await _db.Appointments
                    .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now && x.StartAtUtc <= now.AddDays(7))
                    .OrderBy(x => x.StartAtUtc)
                    .Take(10)
                    .Select(x => new
                    {
                        x.Id,
                        Patient = x.Patient!.FirstName + " " + x.Patient.LastName,
                        Doctor  = x.Doctor!.FullName,
                        x.ProcedureName,
                        x.StartAtUtc,
                        x.Status
                    })
                    .ToListAsync());

            case WidgetTypes.ListLatestAppts:
                return Ok(await _db.Appointments
                    .Where(x => x.ClinicId == clinicId)
                    .OrderByDescending(x => x.StartAtUtc)
                    .Take(8)
                    .Select(x => new
                    {
                        x.Id,
                        Patient = x.Patient!.FirstName + " " + x.Patient.LastName,
                        Doctor  = x.Doctor!.FullName,
                        x.ProcedureName,
                        x.StartAtUtc,
                        x.Status
                    })
                    .ToListAsync());

            case WidgetTypes.ChartDoctorLoad:
                return Ok(await _db.Appointments
                    .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now && x.StartAtUtc <= now.AddDays(7))
                    .GroupBy(x => x.Doctor!.FullName)
                    .Select(g => new { doctor = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .ToListAsync());

            case WidgetTypes.ListLeads:
                return Ok(await _db.Patients
                    .Where(x => x.ClinicId == clinicId && x.LeadStatus != LeadStatuses.Treated && x.LeadStatus != LeadStatuses.Cancelled)
                    .OrderByDescending(x => x.CreatedAtUtc)
                    .Take(8)
                    .Select(x => new
                    {
                        x.Id,
                        x.FirstName, x.LastName,
                        x.LeadStatus, x.InterestedProcedure,
                        x.AssignedConsultant, x.CreatedAtUtc
                    })
                    .ToListAsync());

            case WidgetTypes.ChartLeadFunnel:
                return Ok(await _db.Patients
                    .Where(x => x.ClinicId == clinicId)
                    .GroupBy(x => x.LeadStatus)
                    .Select(g => new { status = g.Key, count = g.Count() })
                    .ToListAsync());

            case WidgetTypes.ChartMonthlyAppts:
                return Ok(await _db.Appointments
                    .Where(x => x.ClinicId == clinicId && x.StartAtUtc >= now.AddMonths(-6))
                    .GroupBy(x => new { x.StartAtUtc.Year, x.StartAtUtc.Month })
                    .Select(g => new { year = g.Key.Year, month = g.Key.Month, count = g.Count() })
                    .OrderBy(x => x.year).ThenBy(x => x.month)
                    .ToListAsync());

            case WidgetTypes.KpiPendingRequests:
            {
                var pending  = await _db.AppointmentRequests.CountAsync(x => x.ClinicId == clinicId && x.Status == "Pending");
                var approved = await _db.AppointmentRequests.CountAsync(x => x.ClinicId == clinicId && x.Status == "Approved" && x.CreatedAtUtc >= monthStart);
                return Ok(new { value = pending, label = "Bekleyen İstek", thisMonth = approved, lastMonth = 0, trendPct = 0, note = $"Bu ay {approved} onaylandı" });
            }

            case WidgetTypes.ListPendingRequests:
                return Ok(await _db.AppointmentRequests
                    .Include(x => x.Doctor)
                    .Where(x => x.ClinicId == clinicId && x.Status == "Pending")
                    .OrderBy(x => x.RequestedStartUtc)
                    .Take(8)
                    .Select(x => new
                    {
                        x.Id,
                        Patient      = x.PatientFirstName + " " + x.PatientLastName,
                        Doctor       = x.Doctor!.FullName,
                        ProcedureName = x.ProcedureName,
                        StartAtUtc   = x.RequestedStartUtc,
                        Status       = "Pending",
                    })
                    .ToListAsync());

            default:
                return NotFound(new { message = $"Widget türü bulunamadı: {widgetType}" });
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private async Task<List<DashboardWidget>> SeedDefaultWidgetsAsync(
        Guid userId, Guid clinicId, string role)
    {
        var types = WidgetTypes.RoleDefaults.GetValueOrDefault(role)
                    ?? WidgetTypes.RoleDefaults["Resepsiyon"];

        var widgets = types.Select((t, i) => new DashboardWidget
        {
            ClinicId   = clinicId,
            UserId     = userId,
            WidgetType = t,
            SortOrder  = i,
            Size       = t.StartsWith("chart") ? "large" : t.StartsWith("list") ? "large" : "medium"
        }).ToList();

        _db.DashboardWidgets.AddRange(widgets);
        await _db.SaveChangesAsync();
        return widgets;
    }
}
