using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.Models;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DemoController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<DemoController> _log;

    public DemoController(AppDbContext db, ILogger<DemoController> log)
    {
        _db  = db;
        _log = log;
    }

    // POST api/demo/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] DemoRegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ClinicName))
            return BadRequest(new { message = "Klinik adı zorunlu." });
        if (string.IsNullOrWhiteSpace(req.FullName))
            return BadRequest(new { message = "Ad soyad zorunlu." });
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { message = "Geçerli bir e-posta adresi giriniz." });
        if (string.IsNullOrWhiteSpace(req.Phone))
            return BadRequest(new { message = "Telefon numarası zorunlu." });

        // Email daha önce kullanılmış mı?
        if (await _db.Users.AnyAsync(u => u.Email == req.Email.Trim().ToLower()))
            return Conflict(new { message = "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin." });

        var managerRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == "KlinikYonetici");
        if (managerRole is null)
            return StatusCode(500, new { message = "Sistem hatası. Lütfen daha sonra tekrar deneyin." });

        // Kullanıcı adı oluştur: emailden @ öncesi + random 4 rakam
        var baseUser = req.Email.Split('@')[0]
            .ToLower()
            .Replace(".", "")
            .Replace("-", "")
            .Replace("_", "");
        if (baseUser.Length > 16) baseUser = baseUser[..16];
        var rand4   = new Random().Next(1000, 9999).ToString();
        var userName = $"{baseUser}{rand4}";

        // Çakışma kontrolü
        while (await _db.Users.AnyAsync(u => u.UserName == userName))
            userName = $"{baseUser}{new Random().Next(1000, 9999)}";

        // Geçici şifre üret (8 karakter: büyük + küçük + rakam)
        var tempPassword = GeneratePassword();

        // Klinik oluştur
        var clinic = new Clinic
        {
            Name          = req.ClinicName.Trim(),
            City          = req.City?.Trim(),
            Country       = "Türkiye",
            IsActive      = true,
            Plan          = "trial",
            TrialEndsAtUtc = DateTime.UtcNow.AddDays(30),
        };
        _db.Clinics.Add(clinic);
        await _db.SaveChangesAsync();

        // Yönetici kullanıcı
        var admin = new User
        {
            ClinicId     = clinic.Id,
            FullName     = req.FullName.Trim(),
            UserName     = userName,
            Email        = req.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            RoleId       = managerRole.Id,
            IsActive     = true,
        };
        _db.Users.Add(admin);

        // Organizasyon ayarları
        _db.OrganizationSettings.Add(new OrganizationSetting
        {
            ClinicId         = clinic.Id,
            CompanyName      = clinic.Name,
            ApplicationTitle = "e-Clinic",
            PrimaryColor     = "#1d4ed8",
        });

        // Tüm modülleri 30 gün trial olarak aktifleştir
        var allModules = new[]
        {
            ModuleCodes.Crm, ModuleCodes.Appointments, ModuleCodes.Doctors,
            ModuleCodes.Reports, ModuleCodes.Finance, ModuleCodes.Inventory,
            ModuleCodes.Assets, ModuleCodes.Tasks, ModuleCodes.Notifications,
            ModuleCodes.Documents, ModuleCodes.Surveys, ModuleCodes.Whatsapp,
        };

        foreach (var code in allModules)
        {
            _db.ModuleLicenses.Add(new ModuleLicense
            {
                ClinicId     = clinic.Id,
                ModuleCode   = code,
                IsActive     = true,
                ExpiresAtUtc = clinic.TrialEndsAtUtc,
            });
        }

        await _db.SaveChangesAsync();

        _log.LogInformation("Demo kaydı: {ClinicName} | {Email} | kullanıcı: {UserName}",
            clinic.Name, admin.Email, admin.UserName);

        return Ok(new
        {
            message      = "Demo hesabınız oluşturuldu!",
            userName,
            tempPassword,
            trialEndsAt  = clinic.TrialEndsAtUtc!.Value.ToString("dd.MM.yyyy"),
            loginUrl     = "/login",
        });
    }

    // GET api/demo/check-trial — klinik trial süresi dolmuş mu? (AuthController'dan çağrılır)
    [HttpGet("check-trial/{clinicId}")]
    public async Task<IActionResult> CheckTrial(Guid clinicId)
    {
        var clinic = await _db.Clinics.FindAsync(clinicId);
        if (clinic is null) return NotFound();

        var expired = clinic.TrialEndsAtUtc.HasValue && clinic.TrialEndsAtUtc.Value < DateTime.UtcNow;
        return Ok(new
        {
            plan          = clinic.Plan ?? "active",
            trialEndsAt   = clinic.TrialEndsAtUtc,
            trialExpired  = expired,
            daysLeft      = clinic.TrialEndsAtUtc.HasValue
                            ? (int)Math.Max(0, (clinic.TrialEndsAtUtc.Value - DateTime.UtcNow).TotalDays)
                            : (int?)null,
        });
    }

    private static string GeneratePassword()
    {
        const string upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower  = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        var rng = new Random();
        return new string(new[]
        {
            upper[rng.Next(upper.Length)],
            upper[rng.Next(upper.Length)],
            lower[rng.Next(lower.Length)],
            lower[rng.Next(lower.Length)],
            lower[rng.Next(lower.Length)],
            digits[rng.Next(digits.Length)],
            digits[rng.Next(digits.Length)],
            digits[rng.Next(digits.Length)],
        }.OrderBy(_ => rng.Next()).ToArray());
    }
}

public record DemoRegisterRequest(
    string ClinicName,
    string FullName,
    string Email,
    string Phone,
    string? City
);
