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
public class AppointmentRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;

    public AppointmentRequestsController(AppDbContext db, IEmailService email)
    {
        _db    = db;
        _email = email;
    }

    private async Task<(Guid userId, Guid clinicId)?> GetCtxAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        return user is null ? null : (user.Id, user.ClinicId);
    }

    private static AppointmentRequestResponse ToResponse(AppointmentRequest r) => new()
    {
        Id                = r.Id,
        DoctorName        = r.Doctor?.FullName ?? "",
        DoctorBranch      = r.Doctor?.Branch ?? "",
        RequestedStartUtc = r.RequestedStartUtc,
        RequestedEndUtc   = r.RequestedEndUtc,
        ProcedureName     = r.ProcedureName,
        PatientFirstName  = r.PatientFirstName,
        PatientLastName   = r.PatientLastName,
        PatientPhone      = r.PatientPhone,
        PatientEmail      = r.PatientEmail,
        PatientNotes      = r.PatientNotes,
        Status            = r.Status,
        RejectionReason   = r.RejectionReason,
        CreatedAtUtc      = r.CreatedAtUtc,
    };

    // POST api/appointmentrequests  — PUBLIC, no auth
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Submit([FromBody] SubmitAppointmentRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientFirstName) || string.IsNullOrWhiteSpace(dto.PatientLastName))
            return BadRequest(new { message = "Ad ve soyad zorunlu." });
        if (string.IsNullOrWhiteSpace(dto.ProcedureName))
            return BadRequest(new { message = "İşlem adı zorunlu." });
        if (dto.RequestedStartUtc >= dto.RequestedEndUtc)
            return BadRequest(new { message = "Geçersiz zaman dilimi." });

        var doctor = await _db.Doctors.FirstOrDefaultAsync(x => x.Id == dto.DoctorId && x.IsActive);
        if (doctor is null) return NotFound(new { message = "Doktor bulunamadı." });

        // Conflict check (already booked or pending)
        bool conflict = await _db.Appointments.AnyAsync(x =>
            x.DoctorId == dto.DoctorId && x.Status != "Cancelled" &&
            x.StartAtUtc < dto.RequestedEndUtc && x.EndAtUtc > dto.RequestedStartUtc);

        if (conflict)
            return Conflict(new { message = "Bu zaman dilimi müsait değil. Lütfen başka bir saat seçin." });

        var req = new AppointmentRequest
        {
            ClinicId          = doctor.ClinicId,
            DoctorId          = dto.DoctorId,
            RequestedStartUtc = dto.RequestedStartUtc,
            RequestedEndUtc   = dto.RequestedEndUtc,
            ProcedureName     = dto.ProcedureName.Trim(),
            PatientFirstName  = dto.PatientFirstName.Trim(),
            PatientLastName   = dto.PatientLastName.Trim(),
            PatientPhone      = dto.PatientPhone?.Trim(),
            PatientEmail      = dto.PatientEmail?.Trim(),
            PatientNotes      = dto.PatientNotes?.Trim(),
        };
        _db.AppointmentRequests.Add(req);
        await _db.SaveChangesAsync();

        // Notify patient by email if provided
        if (!string.IsNullOrWhiteSpace(req.PatientEmail))
        {
            var html = $"""
                <p>Merhaba {req.PatientFirstName},</p>
                <p>Randevu talebiniz alınmıştır. Klinik ekibimiz onayladıktan sonra size bildirim yapılacaktır.</p>
                <p><strong>Doktor:</strong> {doctor.FullName}<br>
                <strong>Tarih:</strong> {req.RequestedStartUtc:dd.MM.yyyy HH:mm} UTC<br>
                <strong>İşlem:</strong> {req.ProcedureName}</p>
                <p>Teşekkürler.</p>
                """;
            await _email.SendAsync(req.PatientEmail, "Randevu Talebiniz Alındı", html);
        }

        return Ok(new { message = "Randevu talebiniz alındı. Onay için klinik ile iletişime geçilecektir.", id = req.Id });
    }

    // GET api/appointmentrequests — admin only
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var q = _db.AppointmentRequests
            .Include(x => x.Doctor)
            .Where(x => x.ClinicId == clinicId);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(x => x.Status == status);

        var items = await q.OrderByDescending(x => x.CreatedAtUtc).ToListAsync();
        return Ok(items.Select(ToResponse));
    }

    // GET api/appointmentrequests/count-pending
    [HttpGet("count-pending")]
    [Authorize]
    public async Task<IActionResult> CountPending()
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var count = await _db.AppointmentRequests
            .CountAsync(x => x.ClinicId == ctx.Value.clinicId && x.Status == AppointmentRequestStatuses.Pending);
        return Ok(new { count });
    }

    // PATCH api/appointmentrequests/{id}/review — approve or reject
    [HttpPatch("{id:guid}/review")]
    [Authorize]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewAppointmentRequestDto dto)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId) = ctx.Value;

        var req = await _db.AppointmentRequests
            .Include(x => x.Doctor)
            .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId);
        if (req is null) return NotFound();
        if (req.Status != AppointmentRequestStatuses.Pending)
            return BadRequest(new { message = "Bu talep zaten incelenmiş." });

        req.ReviewedByUserId = userId;
        req.ReviewedAtUtc    = DateTime.UtcNow;

        if (dto.Action == "approve")
        {
            req.Status = AppointmentRequestStatuses.Approved;

            // Create or find patient
            var patient = await _db.Patients.FirstOrDefaultAsync(p =>
                p.ClinicId == clinicId &&
                p.FirstName == req.PatientFirstName &&
                p.LastName  == req.PatientLastName);

            if (patient is null)
            {
                patient = new Patient
                {
                    ClinicId              = clinicId,
                    FirstName             = req.PatientFirstName,
                    LastName              = req.PatientLastName,
                    Phone                 = req.PatientPhone,
                    Email                 = req.PatientEmail,
                    LeadStatus            = "Randevu Oluştu",
                };
                _db.Patients.Add(patient);
                await _db.SaveChangesAsync();
            }

            var appt = new Appointment
            {
                ClinicId      = clinicId,
                PatientId     = patient.Id,
                DoctorId      = req.DoctorId,
                ProcedureName = dto.ProcedureName ?? req.ProcedureName,
                StartAtUtc    = dto.StartAtUtc    ?? req.RequestedStartUtc,
                EndAtUtc      = dto.EndAtUtc      ?? req.RequestedEndUtc,
                Status        = "Scheduled",
                Notes         = req.PatientNotes,
            };
            _db.Appointments.Add(appt);
            req.CreatedAppointmentId = appt.Id;
            await _db.SaveChangesAsync();

            // Notify patient
            if (!string.IsNullOrWhiteSpace(req.PatientEmail))
            {
                var html = $"""
                    <p>Merhaba {req.PatientFirstName},</p>
                    <p>Randevu talebiniz <strong>onaylandı</strong>!</p>
                    <p><strong>Doktor:</strong> {req.Doctor?.FullName}<br>
                    <strong>Tarih:</strong> {appt.StartAtUtc:dd.MM.yyyy HH:mm} UTC<br>
                    <strong>İşlem:</strong> {appt.ProcedureName}</p>
                    <p>Görüşmek üzere!</p>
                    """;
                await _email.SendAsync(req.PatientEmail, "Randevunuz Onaylandı ✓", html);
            }

            return Ok(new { message = "Randevu onaylandı ve sisteme eklendi." });
        }
        else
        {
            req.Status          = AppointmentRequestStatuses.Rejected;
            req.RejectionReason = dto.RejectionReason?.Trim();
            await _db.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(req.PatientEmail))
            {
                var html = $"""
                    <p>Merhaba {req.PatientFirstName},</p>
                    <p>Randevu talebiniz maalesef <strong>reddedildi</strong>.</p>
                    {(string.IsNullOrWhiteSpace(req.RejectionReason) ? "" : $"<p><strong>Sebep:</strong> {req.RejectionReason}</p>")}
                    <p>Farklı bir tarih/saat için tekrar deneyebilirsiniz.</p>
                    """;
                await _email.SendAsync(req.PatientEmail, "Randevu Talebi Hakkında", html);
            }

            return Ok(new { message = "Talep reddedildi." });
        }
    }

    // DELETE api/appointmentrequests/{id}
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetCtxAsync();
        if (ctx is null) return Unauthorized();

        var req = await _db.AppointmentRequests.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == ctx.Value.clinicId);
        if (req is null) return NotFound();
        _db.AppointmentRequests.Remove(req);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
