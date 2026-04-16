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
[Authorize]
public class WhatsAppController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWhatsAppService _wa;

    public WhatsAppController(AppDbContext db, IWhatsAppService wa)
    {
        _db = db;
        _wa = wa;
    }

    private async Task<(Guid userId, Guid clinicId, string userName)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId, user.FullName);
    }

    // GET api/whatsapp/settings
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, _) = ctx.Value;

        var s = await _db.WhatsAppSettings.FirstOrDefaultAsync(x => x.ClinicId == clinicId);
        if (s is null)
            return Ok(new WhatsAppSettingResponse { IsActive = false });

        return Ok(new WhatsAppSettingResponse
        {
            IsActive      = s.IsActive,
            PhoneNumberId = s.PhoneNumberId,
            FromNumber    = s.FromNumber,
            HasToken      = !string.IsNullOrWhiteSpace(s.ApiToken),
            UpdatedAtUtc  = s.UpdatedAtUtc,
        });
    }

    // PUT api/whatsapp/settings
    [HttpPut("settings")]
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    public async Task<IActionResult> SaveSettings([FromBody] SaveWhatsAppSettingRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, _) = ctx.Value;

        var s = await _db.WhatsAppSettings.FirstOrDefaultAsync(x => x.ClinicId == clinicId);
        if (s is null)
        {
            s = new WhatsAppSetting { ClinicId = clinicId };
            _db.WhatsAppSettings.Add(s);
        }

        s.PhoneNumberId = req.PhoneNumberId?.Trim();
        s.FromNumber    = req.FromNumber?.Trim();
        s.IsActive      = req.IsActive;
        s.UpdatedAtUtc  = DateTime.UtcNow;

        // Only update token if provided (non-empty)
        if (!string.IsNullOrWhiteSpace(req.ApiToken))
            s.ApiToken = req.ApiToken.Trim();

        await _db.SaveChangesAsync();
        return Ok(new { message = "Ayarlar kaydedildi." });
    }

    // POST api/whatsapp/send
    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] SendWhatsAppRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, userName) = ctx.Value;

        if (string.IsNullOrWhiteSpace(req.ToNumber))
            return BadRequest(new { message = "Telefon numarası zorunlu." });
        if (string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Mesaj metni zorunlu." });

        var (ok, error) = await _wa.SendTextAsync(clinicId, req.ToNumber, req.Body, req.PatientId, userName);
        return ok
            ? Ok(new { message = "Mesaj gönderildi." })
            : BadRequest(new { message = $"Gönderilemedi: {error ?? "Bilinmeyen hata"}" });
    }

    // POST api/whatsapp/send-appointment-reminder
    [HttpPost("send-appointment-reminder")]
    public async Task<IActionResult> SendAppointmentReminder([FromBody] AppointmentReminderRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, userName) = ctx.Value;

        var appt = await _db.Appointments
            .Include(x => x.Patient)
            .Include(x => x.Doctor)
            .FirstOrDefaultAsync(x => x.Id == req.AppointmentId && x.ClinicId == clinicId);

        if (appt is null) return NotFound(new { message = "Randevu bulunamadı." });

        var phone = appt.Patient?.Phone;
        if (string.IsNullOrWhiteSpace(phone))
            return BadRequest(new { message = "Hastanın telefon numarası kayıtlı değil." });

        var body = WhatsAppTemplates.AppointmentReminder(
            $"{appt.Patient!.FirstName} {appt.Patient.LastName}".Trim(),
            appt.Doctor?.FullName ?? "Doktor",
            appt.StartAtUtc.ToString("dd.MM.yyyy HH:mm")
        );

        var (ok, error) = await _wa.SendTextAsync(clinicId, phone, body, appt.PatientId, userName);
        return ok
            ? Ok(new { message = "Hatırlatma gönderildi." })
            : BadRequest(new { message = $"Gönderilemedi: {error ?? "Bilinmeyen hata"}" });
    }

    // POST api/whatsapp/bulk  — send to a filtered patient segment
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkSend([FromBody] BulkWhatsAppRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, userName) = ctx.Value;

        if (string.IsNullOrWhiteSpace(req.Message))
            return BadRequest(new { message = "Mesaj metni zorunlu." });

        // Build patient query with optional filters
        var q = _db.Patients.Where(x => x.ClinicId == clinicId && x.Phone != null && x.Phone.Length > 0);
        if (!string.IsNullOrWhiteSpace(req.LeadStatus))
            q = q.Where(x => x.LeadStatus == req.LeadStatus);
        if (!string.IsNullOrWhiteSpace(req.InterestedProcedure))
            q = q.Where(x => x.InterestedProcedure != null && x.InterestedProcedure.Contains(req.InterestedProcedure));
        if (req.PatientIds is { Count: > 0 })
            q = q.Where(x => req.PatientIds.Contains(x.Id));

        var patients = await q.Select(x => new { x.Id, x.FirstName, x.LastName, x.Phone }).ToListAsync();

        if (patients.Count == 0)
            return Ok(new { sent = 0, failed = 0, message = "Uygun hasta bulunamadı." });

        int sent = 0, failed = 0;
        foreach (var p in patients)
        {
            var body = req.Message
                .Replace("{ad}", p.FirstName)
                .Replace("{soyad}", p.LastName)
                .Replace("{ad_soyad}", $"{p.FirstName} {p.LastName}");

            var (ok, _) = await _wa.SendTextAsync(clinicId, p.Phone!, body, p.Id, userName);
            if (ok) sent++; else failed++;

            // Small delay between messages to avoid rate limiting
            await Task.Delay(200);
        }

        return Ok(new { sent, failed, total = patients.Count,
            message = $"{sent} mesaj gönderildi, {failed} başarısız." });
    }

    // GET api/whatsapp/logs?page=1&limit=50
    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs([FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, _) = ctx.Value;

        var q = _db.WhatsAppLogs
            .Where(x => x.ClinicId == clinicId)
            .OrderByDescending(x => x.CreatedAtUtc);

        var total = await q.CountAsync();
        var items = await q
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new WhatsAppLogResponse
            {
                Id          = x.Id,
                ToNumber    = x.ToNumber,
                MessageBody = x.MessageBody,
                Status      = x.Status,
                ErrorDetail = x.ErrorDetail,
                PatientName = x.Patient != null ? x.Patient.FirstName + " " + x.Patient.LastName : null,
                SentByName  = x.SentByName,
                CreatedAtUtc = x.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(new { total, page, limit, items });
    }

    // GET api/whatsapp/stats
    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId, _) = ctx.Value;

        var logs = await _db.WhatsAppLogs.Where(x => x.ClinicId == clinicId).ToListAsync();
        return Ok(new
        {
            total   = logs.Count,
            sent    = logs.Count(x => x.Status == "sent"),
            failed  = logs.Count(x => x.Status == "failed"),
            pending = logs.Count(x => x.Status == "pending"),
            today   = logs.Count(x => x.CreatedAtUtc.Date == DateTime.UtcNow.Date),
        });
    }
}
