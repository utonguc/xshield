// Controllers/AuthController.cs
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
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IWebHostEnvironment _env;

    public AuthController(AppDbContext db, ITokenService tokenService, IWebHostEnvironment env)
    {
        _db = db;
        _tokenService = tokenService;
        _env = env;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    // POST api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "E-posta ve şifre zorunludur." });

        var email = request.Email.Trim().ToLowerInvariant();

        if (!email.Contains('@'))
            return BadRequest(new { message = "Geçerli bir e-posta adresi girin." });

        Clinic? clinic = null;
        User?   user   = null;

        if (!string.IsNullOrWhiteSpace(request.TenantId))
        {
            // Tenant ID ile klinik bul — gmail gibi ortak domainlerde kesin ayrım
            var tenantSlug = request.TenantId.Trim().ToLowerInvariant();
            clinic = await _db.Clinics
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.TenantId == tenantSlug);

            if (clinic is null)
                return Unauthorized(new { message = "Klinik ID bulunamadı. Lütfen kontrol edin." });

            user = await _db.Users
                .Include(x => x.Role)
                .Include(x => x.Clinic)
                .FirstOrDefaultAsync(x => x.ClinicId == clinic.Id && x.Email == email);
        }
        else
        {
            // Geriye dönük uyumluluk: email domain'inden klinik bul (veya global tek eşleşme)
            var domain = email[(email.IndexOf('@') + 1)..];

            clinic = await _db.Clinics
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.EmailDomain == domain);

            if (clinic is not null)
            {
                user = await _db.Users
                    .Include(x => x.Role)
                    .Include(x => x.Clinic)
                    .FirstOrDefaultAsync(x => x.ClinicId == clinic.Id && x.Email == email);
            }
            else
            {
                // SuperAdmin veya TenantId/EmailDomain henüz tanımlanmamış klinikler
                var matches = await _db.Users
                    .Include(x => x.Role)
                    .Include(x => x.Clinic)
                    .Where(x => x.Email == email)
                    .ToListAsync();

                if (matches.Count > 1)
                    return Unauthorized(new {
                        message = "Bu e-posta birden fazla klinikte kayıtlı. Lütfen Klinik ID'nizi girerek tekrar deneyin."
                    });

                user = matches.FirstOrDefault();
            }
        }

        if (user is null || !user.IsActive || user.Clinic is null || !user.Clinic.IsActive)
            return Unauthorized(new { message = "Geçersiz kullanıcı bilgisi." });

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Geçersiz kullanıcı bilgisi." });

        // Trial süresi kontrolü
        if (user.Clinic.TrialEndsAtUtc.HasValue && user.Clinic.TrialEndsAtUtc.Value < DateTime.UtcNow)
            return Unauthorized(new { message = "Demo süreniz dolmuştur. Devam etmek için lütfen bizimle iletişime geçin.", trialExpired = true });

        var daysLeft = user.Clinic.TrialEndsAtUtc.HasValue
            ? (int)Math.Max(0, (user.Clinic.TrialEndsAtUtc.Value - DateTime.UtcNow).TotalDays)
            : (int?)null;

        return Ok(new LoginResponse
        {
            AccessToken  = _tokenService.CreateToken(user),
            ExpiresAtUtc = _tokenService.GetExpiryUtc(),
            UserName     = user.UserName,
            FullName     = user.FullName,
            Role         = user.Role?.Name,
            TrialDaysLeft = daysLeft,
        });
    }

    // GET api/auth/me
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users
            .Include(x => x.Role)
            .Include(x => x.Clinic)
            .FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null || user.Clinic is null) return NotFound();

        var activeModules = await _db.ModuleLicenses
            .Where(x => x.ClinicId == user.ClinicId && x.IsActive &&
                        (x.ExpiresAtUtc == null || x.ExpiresAtUtc > DateTime.UtcNow))
            .Select(x => x.ModuleCode)
            .ToListAsync();

        // SuperAdmin ve KlinikYonetici'ye tam erişim (null = kısıtsız)
        List<string>? allowedMenus = null;
        var roleName = user.Role?.Name ?? "";
        if (roleName != "SuperAdmin" && roleName != "KlinikYonetici")
        {
            allowedMenus = await _db.UserMenuPermissions
                .Where(p => p.UserId == user.Id)
                .Select(p => p.MenuKey)
                .ToListAsync();
        }

        return Ok(new MeResponse
        {
            UserId = user.Id.ToString(),
            ClinicId = user.ClinicId.ToString(),
            ClinicName = user.Clinic.Name,
            UserName = user.UserName,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role?.Name,
            ActiveModules = activeModules,
            ProfilePhotoUrl = user.ProfilePhotoUrl,
            AllowedMenus = allowedMenus,
        });
    }

    // PUT api/auth/profile
    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Ad Soyad zorunlu." });

        // Email uniqueness check within same clinic
        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
        {
            var exists = await _db.Users.AnyAsync(x =>
                x.ClinicId == user.ClinicId && x.Email == request.Email && x.Id != user.Id);
            if (exists) return BadRequest(new { message = "Bu e-posta adresi zaten kullanımda." });
        }

        user.FullName = request.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(request.Email))
            user.Email = request.Email.Trim();

        await _db.SaveChangesAsync();
        return Ok(new { message = "Profil güncellendi." });
    }

    // POST api/auth/photo
    [Authorize]
    [HttpPost("photo")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadPhoto([FromForm] IFormFile file)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return NotFound();

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Dosya bulunamadı." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!new[] { ".png", ".jpg", ".jpeg", ".webp" }.Contains(ext))
            return BadRequest(new { message = "Desteklenmeyen dosya türü." });

        var dir = Path.Combine(_env.ContentRootPath, "uploads", "users");
        Directory.CreateDirectory(dir);

        var fileName = $"{userId}{ext}";
        await using var stream = System.IO.File.Create(Path.Combine(dir, fileName));
        await file.CopyToAsync(stream);

        user.ProfilePhotoUrl = $"/uploads/users/{fileName}";
        await _db.SaveChangesAsync();

        return Ok(new { profilePhotoUrl = user.ProfilePhotoUrl });
    }

    // POST api/auth/change-password
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mevcut şifre yanlış." });

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return BadRequest(new { message = "Yeni şifre en az 6 karakter olmalı." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Şifre başarıyla değiştirildi." });
    }
}
