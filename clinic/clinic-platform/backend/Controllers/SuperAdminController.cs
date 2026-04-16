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
[Route("api/superadmin")]
[Authorize(Roles = "SuperAdmin")]
public class SuperAdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public SuperAdminController(AppDbContext db) => _db = db;

    // GET api/superadmin/clinics
    [HttpGet("clinics")]
    public async Task<IActionResult> GetClinics()
    {
        var clinics = await _db.Clinics
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        var result = new List<ClinicListItemResponse>();

        foreach (var c in clinics)
        {
            var userCount    = await _db.Users.CountAsync(x => x.ClinicId == c.Id);
            var patientCount = await _db.Patients.CountAsync(x => x.ClinicId == c.Id);
            var modules      = await _db.ModuleLicenses
                .Where(x => x.ClinicId == c.Id && x.IsActive)
                .Select(x => x.ModuleCode)
                .ToListAsync();

            result.Add(new ClinicListItemResponse
            {
                Id            = c.Id,
                Name          = c.Name,
                City          = c.City,
                Country       = c.Country,
                EmailDomain   = c.EmailDomain,
                IsActive      = c.IsActive,
                UserCount     = userCount,
                PatientCount  = patientCount,
                ActiveModules = modules,
                CreatedAtUtc  = c.CreatedAtUtc
            });
        }

        return Ok(result);
    }

    // POST api/superadmin/clinics  — klinik + yönetici + modülleri birlikte oluştur
    [HttpPost("clinics")]
    public async Task<IActionResult> CreateClinic([FromBody] CreateClinicRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Klinik adı zorunlu." });
        if (string.IsNullOrWhiteSpace(req.AdminUserName))
            return BadRequest(new { message = "Yönetici kullanıcı adı zorunlu." });
        if (string.IsNullOrWhiteSpace(req.AdminPassword) || req.AdminPassword.Length < 6)
            return BadRequest(new { message = "Şifre en az 6 karakter olmalı." });

        // Kullanıcı adı benzersiz mi?
        if (await _db.Users.AnyAsync(x => x.UserName == req.AdminUserName))
            return Conflict(new { message = "Bu kullanıcı adı zaten mevcut." });

        var managerRole = await _db.Roles.FirstOrDefaultAsync(x => x.Name == "KlinikYonetici");
        if (managerRole is null)
            return StatusCode(500, new { message = "KlinikYonetici rolü bulunamadı." });

        // Email domain çakışması kontrolü
        var emailDomain = req.EmailDomain?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(emailDomain) &&
            await _db.Clinics.AnyAsync(x => x.EmailDomain == emailDomain))
            return Conflict(new { message = "Bu e-posta domaini başka bir kliniğe kayıtlı." });

        // Klinik oluştur
        var clinic = new Clinic
        {
            Name        = req.Name.Trim(),
            City        = req.City?.Trim(),
            Country     = req.Country?.Trim(),
            EmailDomain = string.IsNullOrEmpty(emailDomain) ? null : emailDomain,
            IsActive    = true
        };
        _db.Clinics.Add(clinic);
        await _db.SaveChangesAsync();

        // Yönetici kullanıcı oluştur
        var admin = new User
        {
            ClinicId     = clinic.Id,
            FullName     = req.AdminFullName.Trim(),
            UserName     = req.AdminUserName.Trim(),
            Email        = req.AdminEmail.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.AdminPassword),
            RoleId       = managerRole.Id,
            IsActive     = true
        };
        _db.Users.Add(admin);

        // Varsayılan org settings
        _db.OrganizationSettings.Add(new OrganizationSetting
        {
            ClinicId         = clinic.Id,
            CompanyName      = clinic.Name,
            ApplicationTitle = "EstetixOS",
            PrimaryColor     = "#1d4ed8"
        });

        // Modül lisansları
        var modulesToActivate = req.InitialModules.Any()
            ? req.InitialModules
            : new List<string> { ModuleCodes.Crm, ModuleCodes.Appointments, ModuleCodes.Doctors, ModuleCodes.Reports };

        foreach (var code in modulesToActivate.Distinct())
        {
            if (ModuleCodes.Labels.ContainsKey(code))
            {
                _db.ModuleLicenses.Add(new ModuleLicense
                {
                    ClinicId   = clinic.Id,
                    ModuleCode = code,
                    IsActive   = true
                });
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            clinicId    = clinic.Id,
            adminUserId = admin.Id,
            message     = $"Klinik '{clinic.Name}' ve yönetici hesabı oluşturuldu."
        });
    }

    // PATCH api/superadmin/clinics/{id}/toggle
    [HttpPatch("clinics/{id:guid}/toggle")]
    public async Task<IActionResult> ToggleClinic(Guid id)
    {
        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic is null) return NotFound(new { message = "Klinik bulunamadı." });

        clinic.IsActive = !clinic.IsActive;
        await _db.SaveChangesAsync();
        return Ok(new { id = clinic.Id, isActive = clinic.IsActive });
    }

    // GET api/superadmin/clinics/{id}/modules
    [HttpGet("clinics/{id:guid}/modules")]
    public async Task<IActionResult> GetModules(Guid id)
    {
        var licenses = await _db.ModuleLicenses
            .Where(x => x.ClinicId == id)
            .ToListAsync();

        var result = ModuleCodes.Labels.Select(kv => new ModuleLicenseResponse
        {
            ModuleCode  = kv.Key,
            ModuleLabel = kv.Value,
            IsActive    = licenses.Any(l => l.ModuleCode == kv.Key && l.IsActive),
            ExpiresAtUtc = licenses.FirstOrDefault(l => l.ModuleCode == kv.Key)?.ExpiresAtUtc
        });

        return Ok(result);
    }

    // PUT api/superadmin/modules/toggle
    [HttpPut("modules/toggle")]
    public async Task<IActionResult> ToggleModule([FromBody] ToggleModuleRequest req)
    {
        if (!ModuleCodes.Labels.ContainsKey(req.ModuleCode))
            return BadRequest(new { message = "Geçersiz modül kodu." });

        var license = await _db.ModuleLicenses
            .FirstOrDefaultAsync(x => x.ClinicId == req.ClinicId && x.ModuleCode == req.ModuleCode);

        if (license is null)
        {
            license = new ModuleLicense
            {
                ClinicId    = req.ClinicId,
                ModuleCode  = req.ModuleCode,
                IsActive    = req.IsActive,
                ExpiresAtUtc = req.ExpiresAtUtc
            };
            _db.ModuleLicenses.Add(license);
        }
        else
        {
            license.IsActive     = req.IsActive;
            license.ExpiresAtUtc = req.ExpiresAtUtc;
        }

        await _db.SaveChangesAsync();
        return Ok(new { clinicId = req.ClinicId, moduleCode = req.ModuleCode, isActive = license.IsActive });
    }

    // PUT api/superadmin/clinics/{id}  — klinik bilgilerini güncelle
    [HttpPut("clinics/{id:guid}")]
    public async Task<IActionResult> UpdateClinic(Guid id, [FromBody] UpdateClinicRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Klinik adı zorunlu." });

        var clinic = await _db.Clinics.FindAsync(id);
        if (clinic is null) return NotFound(new { message = "Klinik bulunamadı." });

        // Email domain çakışması kontrolü
        var emailDomain = req.EmailDomain?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(emailDomain) && emailDomain != clinic.EmailDomain &&
            await _db.Clinics.AnyAsync(x => x.EmailDomain == emailDomain && x.Id != id))
            return Conflict(new { message = "Bu e-posta domaini başka bir kliniğe kayıtlı." });

        clinic.Name        = req.Name.Trim();
        clinic.City        = req.City?.Trim();
        clinic.Country     = req.Country?.Trim();
        clinic.IsActive    = req.IsActive;
        clinic.EmailDomain = string.IsNullOrEmpty(emailDomain) ? null : emailDomain;

        // Org settings adını da güncelle
        var org = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.ClinicId == id);
        if (org != null) org.CompanyName = clinic.Name;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Klinik güncellendi." });
    }

    // GET api/superadmin/clinics/{id}/users  — klinik kullanıcı listesi
    [HttpGet("clinics/{id:guid}/users")]
    public async Task<IActionResult> GetClinicUsers(Guid id)
    {
        var users = await _db.Users
            .Where(x => x.ClinicId == id)
            .Include(x => x.Role)
            .OrderBy(x => x.FullName)
            .Select(x => new
            {
                x.Id, x.FullName, x.UserName, x.Email,
                x.IsActive, RoleName = x.Role!.Name,
                x.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(users);
    }

    // GET api/superadmin/modules  — tüm modül kodları ve etiketleri
    [HttpGet("modules")]
    public IActionResult GetAllModules() =>
        Ok(ModuleCodes.Labels.Select(kv => new { code = kv.Key, label = kv.Value }));
}
