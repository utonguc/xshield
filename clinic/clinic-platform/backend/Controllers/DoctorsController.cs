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
public class DoctorsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public DoctorsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db  = db;
        _env = env;
    }

    private async Task<Guid?> GetClinicIdAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.Where(x => x.Id == userId).Select(x => (Guid?)x.ClinicId).FirstOrDefaultAsync();
    }

    // GET api/doctors?activeOnly=true
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = false)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var q = _db.Doctors.Where(x => x.ClinicId == clinicId.Value);
        if (activeOnly) q = q.Where(x => x.IsActive);

        var items = await q
            .OrderBy(x => x.FullName)
            .Select(x => new DoctorResponse
            {
                Id = x.Id, FullName = x.FullName, Branch = x.Branch,
                Phone = x.Phone, Email = x.Email, PhotoUrl = x.PhotoUrl,
                Biography = x.Biography, Specializations = x.Specializations,
                ExperienceYears = x.ExperienceYears, Certificates = x.Certificates,
                IsActive = x.IsActive, CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(items);
    }

    // GET api/doctors/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var d = await _db.Doctors.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (d is null) return NotFound(new { message = "Doktor bulunamadı." });

        return Ok(Map(d));
    }

    // POST api/doctors
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDoctorRequest req)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.FullName))
            return BadRequest(new { message = "Ad soyad zorunlu." });

        var doctor = new Doctor
        {
            ClinicId        = clinicId.Value,
            FullName        = req.FullName.Trim(),
            Branch          = req.Branch?.Trim(),
            Phone           = req.Phone?.Trim(),
            Email           = req.Email?.Trim().ToLower(),
            PhotoUrl        = req.PhotoUrl,
            Biography       = req.Biography,
            Specializations = req.Specializations,
            ExperienceYears = req.ExperienceYears,
            Certificates    = req.Certificates,
            IsActive        = true
        };

        _db.Doctors.Add(doctor);
        await _db.SaveChangesAsync();
        return Ok(doctor.Id);
    }

    // PUT api/doctors/{id}
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDoctorRequest req)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var d = await _db.Doctors.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (d is null) return NotFound(new { message = "Doktor bulunamadı." });

        if (string.IsNullOrWhiteSpace(req.FullName))
            return BadRequest(new { message = "Ad soyad zorunlu." });

        d.FullName        = req.FullName.Trim();
        d.Branch          = req.Branch?.Trim();
        d.Phone           = req.Phone?.Trim();
        d.Email           = req.Email?.Trim().ToLower();
        d.PhotoUrl        = req.PhotoUrl;
        d.Biography       = req.Biography;
        d.Specializations = req.Specializations;
        d.ExperienceYears = req.ExperienceYears;
        d.Certificates    = req.Certificates;
        d.IsActive        = req.IsActive;

        await _db.SaveChangesAsync();
        return Ok(d.Id);
    }

    // POST api/doctors/{id}/photo
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    [HttpPost("{id:guid}/photo")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadPhoto(Guid id, [FromForm] IFormFile file)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var d = await _db.Doctors.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (d is null) return NotFound(new { message = "Doktor bulunamadı." });

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Dosya bulunamadı." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!new[] { ".png", ".jpg", ".jpeg", ".webp" }.Contains(ext))
            return BadRequest(new { message = "Desteklenmeyen dosya türü." });

        var dir = Path.Combine(_env.ContentRootPath, "uploads", "doctors");
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        await using var stream = System.IO.File.Create(Path.Combine(dir, fileName));
        await file.CopyToAsync(stream);

        d.PhotoUrl = $"/uploads/doctors/{fileName}";
        await _db.SaveChangesAsync();

        return Ok(new { photoUrl = d.PhotoUrl });
    }

    // DELETE api/doctors/{id}
    [Authorize(Roles = "SuperAdmin,KlinikYonetici")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var d = await _db.Doctors.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId.Value);
        if (d is null) return NotFound(new { message = "Doktor bulunamadı." });

        var hasUpcoming = await _db.Appointments.AnyAsync(x =>
            x.DoctorId == id && x.StartAtUtc > DateTime.UtcNow && x.Status != "Cancelled");

        if (hasUpcoming)
            return Conflict(new { message = "Bu doktorun gelecek randevuları var. Önce iptal edin." });

        _db.Doctors.Remove(d);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static DoctorResponse Map(Doctor d) => new()
    {
        Id = d.Id, FullName = d.FullName, Branch = d.Branch,
        Phone = d.Phone, Email = d.Email, PhotoUrl = d.PhotoUrl,
        Biography = d.Biography, Specializations = d.Specializations,
        ExperienceYears = d.ExperienceYears, Certificates = d.Certificates,
        IsActive = d.IsActive, CreatedAtUtc = d.CreatedAtUtc
    };
}
