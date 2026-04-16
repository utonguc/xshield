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
[Authorize(Roles = "SuperAdmin,KlinikYonetici")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;

    public SettingsController(AppDbContext db, IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(sub) || !Guid.TryParse(sub, out var userId))
            return null;

        return await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
    }

    [HttpGet("organization")]
    public async Task<IActionResult> GetOrganization()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser is null) return Unauthorized();

        var item = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.ClinicId == currentUser.ClinicId);

        if (item is null)
        {
            item = new OrganizationSetting
            {
                ClinicId = currentUser.ClinicId
            };
            _db.OrganizationSettings.Add(item);
            await _db.SaveChangesAsync();
        }

        return Ok(new OrganizationSettingsResponse
        {
            Id = item.Id,
            ClinicId = item.ClinicId,
            CompanyName = item.CompanyName,
            ApplicationTitle = item.ApplicationTitle,
            LogoUrl = item.LogoUrl,
            PrimaryColor = item.PrimaryColor
        });
    }

    [HttpPut("organization")]
    public async Task<IActionResult> UpdateOrganization([FromBody] UpdateOrganizationSettingsRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser is null) return Unauthorized();

        var item = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.ClinicId == currentUser.ClinicId);

        if (item is null)
        {
            item = new OrganizationSetting
            {
                ClinicId = currentUser.ClinicId
            };
            _db.OrganizationSettings.Add(item);
        }

        item.CompanyName = string.IsNullOrWhiteSpace(request.CompanyName) ? "Klinik" : request.CompanyName;
        item.LogoUrl = request.LogoUrl;
        item.PrimaryColor = string.IsNullOrWhiteSpace(request.PrimaryColor) ? "#1d4ed8" : request.PrimaryColor;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(item.Id);
    }

    [HttpPost("organization/logo")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadLogo([FromForm] IFormFile file)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser is null) return Unauthorized();

        if (file is null || file.Length == 0)
            return BadRequest("Dosya bulunamadı.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".png", ".jpg", ".jpeg", ".webp", ".svg" };
        if (!allowed.Contains(extension))
            return BadRequest("Desteklenmeyen dosya türü.");

        var uploadsRoot = Path.Combine(_environment.ContentRootPath, "uploads", "logos");
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(uploadsRoot, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        var relativeUrl = $"/uploads/logos/{fileName}";

        var item = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.ClinicId == currentUser.ClinicId);
        if (item is null)
        {
            item = new OrganizationSetting
            {
                ClinicId = currentUser.ClinicId
            };
            _db.OrganizationSettings.Add(item);
        }

        item.LogoUrl = relativeUrl;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { logoUrl = relativeUrl });
    }
}
