using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ClinicPlatform.Api.Controllers;

/// <summary>
/// Patient-facing portal API. Uses a separate JWT claim ("portal_patient_id")
/// so portal tokens never grant staff-level access.
/// </summary>
[ApiController]
[Route("api/portal")]
public class PatientPortalController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;

    public PatientPortalController(AppDbContext db, IConfiguration cfg)
    {
        _db  = db;
        _cfg = cfg;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string IssuePortalToken(PatientAccount account)
    {
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim("portal_patient_id", account.PatientId.ToString()),
            new Claim("portal_account_id", account.Id.ToString()),
            new Claim("portal_clinic_id",  account.ClinicId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, account.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };
        var token = new JwtSecurityToken(
            issuer:   _cfg["Jwt:Issuer"],
            audience: _cfg["Jwt:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private (Guid patientId, Guid clinicId)? GetPortalCtx()
    {
        var pidStr = User.FindFirstValue("portal_patient_id");
        var cidStr = User.FindFirstValue("portal_clinic_id");
        if (!Guid.TryParse(pidStr, out var pid) || !Guid.TryParse(cidStr, out var cid))
            return null;
        return (pid, cid);
    }

    // ── Auth endpoints (no [Authorize]) ──────────────────────────────────────

    // POST api/portal/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] PortalRegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email))    return BadRequest(new { message = "E-posta zorunlu." });
        if (string.IsNullOrWhiteSpace(req.Password)) return BadRequest(new { message = "Şifre zorunlu." });
        if (req.Password.Length < 6)                 return BadRequest(new { message = "Şifre en az 6 karakter olmalı." });

        // Find patient in clinic by email
        var patient = await _db.Patients
            .FirstOrDefaultAsync(x => x.ClinicId == req.ClinicId && x.Email == req.Email.ToLower().Trim());

        if (patient is null)
            return NotFound(new { message = "Bu e-posta ile kayıtlı bir hasta bulunamadı. Lütfen kliniğinizle iletişime geçin." });

        // Check if account already exists
        var existing = await _db.PatientAccounts
            .FirstOrDefaultAsync(x => x.ClinicId == req.ClinicId && x.Email == req.Email.ToLower().Trim());
        if (existing is not null)
            return Conflict(new { message = "Bu e-posta ile zaten bir hesap mevcut. Giriş yapabilirsiniz." });

        var account = new PatientAccount
        {
            PatientId    = patient.Id,
            ClinicId     = req.ClinicId,
            Email        = req.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        };
        _db.PatientAccounts.Add(account);
        await _db.SaveChangesAsync();

        return Ok(new { token = IssuePortalToken(account), message = "Hesap oluşturuldu." });
    }

    // POST api/portal/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] PortalLoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "E-posta ve şifre zorunlu." });

        var account = await _db.PatientAccounts
            .Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.ClinicId == req.ClinicId && x.Email == req.Email.ToLower().Trim() && x.IsActive);

        if (account is null || !BCrypt.Net.BCrypt.Verify(req.Password, account.PasswordHash))
            return Unauthorized(new { message = "E-posta veya şifre hatalı." });

        account.LastLoginUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            token      = IssuePortalToken(account),
            patientId  = account.PatientId,
            firstName  = account.Patient?.FirstName,
            lastName   = account.Patient?.LastName,
            email      = account.Email,
        });
    }

    // POST api/portal/change-password
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] PortalChangePasswordRequest req)
    {
        var ctx = GetPortalCtx();
        if (ctx is null) return Unauthorized();

        var account = await _db.PatientAccounts
            .FirstOrDefaultAsync(x => x.PatientId == ctx.Value.patientId && x.ClinicId == ctx.Value.clinicId);
        if (account is null) return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, account.PasswordHash))
            return BadRequest(new { message = "Mevcut şifre hatalı." });

        if (req.NewPassword.Length < 6)
            return BadRequest(new { message = "Yeni şifre en az 6 karakter olmalı." });

        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Şifre güncellendi." });
    }

    // ── Portal data endpoints (require [Authorize]) ───────────────────────────

    // GET api/portal/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        var ctx = GetPortalCtx();
        if (ctx is null) return Unauthorized();

        var patient = await _db.Patients
            .FirstOrDefaultAsync(x => x.Id == ctx.Value.patientId && x.ClinicId == ctx.Value.clinicId);
        if (patient is null) return NotFound();

        var clinic = await _db.Clinics.FirstOrDefaultAsync(x => x.Id == ctx.Value.clinicId);
        var settings = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.ClinicId == ctx.Value.clinicId);

        return Ok(new
        {
            patient = new
            {
                id        = patient.Id,
                firstName = patient.FirstName,
                lastName  = patient.LastName,
                email     = patient.Email,
                phone     = patient.Phone,
                birthDate = patient.BirthDate,
                gender    = patient.Gender,
                city      = patient.City,
                country   = patient.Country,
            },
            clinic = new
            {
                name         = clinic?.Name ?? settings?.CompanyName ?? "",
                primaryColor = settings?.PrimaryColor ?? "#1d4ed8",
                logoUrl      = settings?.LogoUrl,
            }
        });
    }

    // GET api/portal/appointments
    [HttpGet("appointments")]
    [Authorize]
    public async Task<IActionResult> GetAppointments()
    {
        var ctx = GetPortalCtx();
        if (ctx is null) return Unauthorized();

        var appts = await _db.Appointments
            .Include(x => x.Doctor)
            .Where(x => x.PatientId == ctx.Value.patientId && x.ClinicId == ctx.Value.clinicId)
            .OrderByDescending(x => x.StartAtUtc)
            .Take(50)
            .Select(x => new
            {
                id            = x.Id,
                doctorName    = x.Doctor!.FullName,
                doctorBranch  = x.Doctor.Branch,
                procedureName = x.ProcedureName,
                startAtUtc    = x.StartAtUtc,
                endAtUtc      = x.EndAtUtc,
                status        = x.Status,
                notes         = x.Notes,
            })
            .ToListAsync();

        return Ok(appts);
    }

    // GET api/portal/invoices
    [HttpGet("invoices")]
    [Authorize]
    public async Task<IActionResult> GetInvoices()
    {
        var ctx = GetPortalCtx();
        if (ctx is null) return Unauthorized();

        var invoices = await _db.Invoices
            .Where(x => x.PatientId == ctx.Value.patientId && x.ClinicId == ctx.Value.clinicId)
            .OrderByDescending(x => x.IssuedAtUtc)
            .Take(30)
            .Select(x => new
            {
                id         = x.Id,
                invoiceNo  = x.InvoiceNo,
                issuedAt   = x.IssuedAtUtc,
                dueAt      = x.DueAtUtc,
                status     = x.Status,
                total      = x.Total,
                currency   = x.Currency,
            })
            .ToListAsync();

        return Ok(invoices);
    }

    // GET api/portal/documents
    [HttpGet("documents")]
    [Authorize]
    public async Task<IActionResult> GetDocuments()
    {
        var ctx = GetPortalCtx();
        if (ctx is null) return Unauthorized();

        var docs = await _db.Documents
            .Where(x => x.PatientId == ctx.Value.patientId && x.ClinicId == ctx.Value.clinicId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(30)
            .Select(x => new
            {
                id          = x.Id,
                title       = x.OriginalName,
                category    = x.Category,
                mimeType    = x.MimeType,
                fileSize    = x.FileSize,
                uploadedAt  = x.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(docs);
    }

    // POST api/portal/request-appointment
    [HttpPost("request-appointment")]
    [Authorize]
    public async Task<IActionResult> RequestAppointment([FromBody] PortalAppointmentRequestDto req)
    {
        var ctx = GetPortalCtx();
        if (ctx is null) return Unauthorized();

        var patient = await _db.Patients
            .FirstOrDefaultAsync(x => x.Id == ctx.Value.patientId);
        if (patient is null) return Unauthorized();

        var doctor = await _db.Doctors
            .FirstOrDefaultAsync(x => x.Id == req.DoctorId && x.ClinicId == ctx.Value.clinicId && x.IsActive);
        if (doctor is null) return NotFound(new { message = "Doktor bulunamadı." });

        if (req.RequestedStartUtc >= req.RequestedEndUtc)
            return BadRequest(new { message = "Geçersiz zaman aralığı." });

        _db.AppointmentRequests.Add(new AppointmentRequest
        {
            ClinicId          = ctx.Value.clinicId,
            DoctorId          = req.DoctorId,
            RequestedStartUtc = req.RequestedStartUtc,
            RequestedEndUtc   = req.RequestedEndUtc,
            ProcedureName     = req.ProcedureName?.Trim() ?? "Genel Muayene",
            PatientFirstName  = patient.FirstName,
            PatientLastName   = patient.LastName,
            PatientPhone      = patient.Phone,
            PatientEmail      = patient.Email,
            PatientNotes      = req.Notes?.Trim(),
        });
        await _db.SaveChangesAsync();

        return Ok(new { message = "Randevu talebiniz alındı. Klinik onayladıktan sonra size bildirim yapılacaktır." });
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public class PortalRegisterRequest
{
    public Guid   ClinicId { get; set; }
    public string Email    { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class PortalLoginRequest
{
    public Guid   ClinicId { get; set; }
    public string Email    { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class PortalChangePasswordRequest
{
    public string OldPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class PortalAppointmentRequestDto
{
    public Guid     DoctorId          { get; set; }
    public DateTime RequestedStartUtc { get; set; }
    public DateTime RequestedEndUtc   { get; set; }
    public string?  ProcedureName     { get; set; }
    public string?  Notes             { get; set; }
}
