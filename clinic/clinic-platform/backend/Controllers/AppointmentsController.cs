// Controllers/AppointmentsController.cs
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
public class AppointmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private static readonly TimeSpan ConflictBuffer = TimeSpan.FromMinutes(5);

    private static readonly HashSet<string> ValidStatuses =
        new() { "Scheduled", "Completed", "Cancelled", "NoShow" };

    public AppointmentsController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<Guid?> GetClinicIdAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.Where(x => x.Id == userId).Select(x => (Guid?)x.ClinicId).FirstOrDefaultAsync();
    }

    // GET api/appointments?start=&end=&doctorId=&patientId=&status=
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        [FromQuery] Guid? doctorId,
        [FromQuery] Guid? patientId,
        [FromQuery] string? status)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var query = _db.Appointments
            .Where(x => x.ClinicId == clinicId.Value)
            .AsQueryable();

        if (doctorId.HasValue)  query = query.Where(x => x.DoctorId == doctorId.Value);
        if (patientId.HasValue) query = query.Where(x => x.PatientId == patientId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);

        if (start.HasValue && end.HasValue)
            query = query.Where(x => x.StartAtUtc < end.Value && x.EndAtUtc > start.Value);
        else if (start.HasValue)
            query = query.Where(x => x.EndAtUtc > start.Value);
        else if (end.HasValue)
            query = query.Where(x => x.StartAtUtc < end.Value);

        var items = await query
            .OrderBy(x => x.StartAtUtc)
            .Select(x => new AppointmentResponse
            {
                Id = x.Id,
                PatientId = x.PatientId,
                PatientFullName = x.Patient!.FirstName + " " + x.Patient.LastName,
                DoctorId = x.DoctorId,
                DoctorFullName = x.Doctor!.FullName,
                ProcedureName = x.ProcedureName,
                StartAtUtc = x.StartAtUtc,
                EndAtUtc = x.EndAtUtc,
                Notes = x.Notes,
                Status = x.Status,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(items);
    }

    // GET api/appointments/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var item = await _db.Appointments
            .Where(x => x.Id == id && x.ClinicId == clinicId.Value)
            .Select(x => new AppointmentResponse
            {
                Id = x.Id,
                PatientId = x.PatientId,
                PatientFullName = x.Patient!.FirstName + " " + x.Patient.LastName,
                DoctorId = x.DoctorId,
                DoctorFullName = x.Doctor!.FullName,
                ProcedureName = x.ProcedureName,
                StartAtUtc = x.StartAtUtc,
                EndAtUtc = x.EndAtUtc,
                Notes = x.Notes,
                Status = x.Status,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .FirstOrDefaultAsync();

        if (item is null) return NotFound("Randevu bulunamadı.");
        return Ok(item);
    }

    // POST api/appointments
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var validation = await ValidateRequestAsync(clinicId.Value,
            request.PatientId, request.DoctorId,
            request.ProcedureName, request.StartAtUtc, request.EndAtUtc, null);
        if (validation is not null) return validation;

        var appointment = new Appointment
        {
            ClinicId      = clinicId.Value,
            PatientId     = request.PatientId,
            DoctorId      = request.DoctorId,
            ProcedureName = request.ProcedureName,
            StartAtUtc    = request.StartAtUtc,
            EndAtUtc      = request.EndAtUtc,
            Notes         = request.Notes,
            Status        = "Scheduled"
        };

        _db.Appointments.Add(appointment);
        await _db.SaveChangesAsync();
        return Ok(appointment.Id);
    }

    // PUT api/appointments/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAppointmentRequest request)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var appointment = await _db.Appointments
            .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (appointment is null) return NotFound("Randevu bulunamadı.");

        if (appointment.Status == "Cancelled")
            return BadRequest(new { message = "İptal edilmiş randevu düzenlenemez." });

        var validation = await ValidateRequestAsync(clinicId.Value,
            request.PatientId, request.DoctorId,
            request.ProcedureName, request.StartAtUtc, request.EndAtUtc, id);
        if (validation is not null) return validation;

        appointment.PatientId     = request.PatientId;
        appointment.DoctorId      = request.DoctorId;
        appointment.ProcedureName = request.ProcedureName;
        appointment.StartAtUtc    = request.StartAtUtc;
        appointment.EndAtUtc      = request.EndAtUtc;
        appointment.Notes         = request.Notes;
        appointment.UpdatedAtUtc  = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(appointment.Id);
    }

    // PATCH api/appointments/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAppointmentStatusRequest request)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        if (!ValidStatuses.Contains(request.Status))
            return BadRequest(new { message = $"Geçersiz status. Geçerli değerler: {string.Join(", ", ValidStatuses)}" });

        var appointment = await _db.Appointments
            .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (appointment is null) return NotFound("Randevu bulunamadı.");

        appointment.Status = request.Status;
        appointment.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { id = appointment.Id, status = appointment.Status });
    }

    // DELETE api/appointments/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var appointment = await _db.Appointments
            .FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (appointment is null) return NotFound("Randevu bulunamadı.");

        _db.Appointments.Remove(appointment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private async Task<IActionResult?> ValidateRequestAsync(
        Guid clinicId, Guid patientId, Guid doctorId,
        string procedureName, DateTime startAtUtc, DateTime endAtUtc,
        Guid? excludeId)
    {
        if (patientId == Guid.Empty) return BadRequest(new { message = "PatientId zorunlu." });
        if (doctorId  == Guid.Empty) return BadRequest(new { message = "DoctorId zorunlu." });
        if (string.IsNullOrWhiteSpace(procedureName))
            return BadRequest(new { message = "ProcedureName zorunlu." });
        if (startAtUtc >= endAtUtc)
            return BadRequest(new { message = "Bitiş zamanı başlangıçtan sonra olmalıdır." });

        var patientExists = await _db.Patients.AnyAsync(x => x.Id == patientId && x.ClinicId == clinicId);
        if (!patientExists) return NotFound(new { message = "Hasta bulunamadı." });

        var doctorExists = await _db.Doctors.AnyAsync(x => x.Id == doctorId && x.ClinicId == clinicId && x.IsActive);
        if (!doctorExists) return NotFound(new { message = "Aktif doktor bulunamadı." });

        var bufferedStart = startAtUtc.Subtract(ConflictBuffer);
        var bufferedEnd   = endAtUtc.Add(ConflictBuffer);

        var conflictQuery = _db.Appointments.Where(x =>
            x.ClinicId == clinicId &&
            x.DoctorId == doctorId &&
            x.Status   != "Cancelled" &&
            x.StartAtUtc < bufferedEnd &&
            x.EndAtUtc   > bufferedStart);

        if (excludeId.HasValue)
            conflictQuery = conflictQuery.Where(x => x.Id != excludeId.Value);

        if (await conflictQuery.AnyAsync())
            return Conflict(new { message = "Bu doktor için bu zaman aralığında başka bir randevu mevcut." });

        return null;
    }
}
