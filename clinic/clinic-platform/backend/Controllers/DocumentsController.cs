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
public class DocumentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private const long MaxFileSize = 50 * 1024 * 1024; // 50 MB

    public DocumentsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db  = db;
        _env = env;
    }

    private string UploadsRoot => Path.Combine(_env.ContentRootPath, "uploads");

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId);
    }

    private static string FormatSize(long bytes)
    {
        if (bytes < 1024)        return $"{bytes} B";
        if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
        return $"{bytes / (1024.0 * 1024):F1} MB";
    }

    private DocumentResponse ToResponse(Document d) => new()
    {
        Id             = d.Id,
        OriginalName   = d.OriginalName,
        Category       = d.Category,
        Description    = d.Description,
        MimeType       = d.MimeType,
        FileSize       = d.FileSize,
        FileSizeLabel  = FormatSize(d.FileSize),
        PatientId      = d.PatientId,
        PatientName    = d.Patient is null ? null : $"{d.Patient.FirstName} {d.Patient.LastName}".Trim(),
        UploadedById   = d.UploadedById,
        UploadedByName = d.UploadedBy?.FullName,
        CreatedAtUtc   = d.CreatedAtUtc,
    };

    // GET api/documents?category=Hasta&patientId=...
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? category,
        [FromQuery] Guid?   patientId,
        [FromQuery] string? search)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var q = _db.Documents
            .Where(x => x.ClinicId == clinicId)
            .Include(x => x.Patient)
            .Include(x => x.UploadedBy)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
        if (patientId.HasValue)                   q = q.Where(x => x.PatientId == patientId);
        if (!string.IsNullOrWhiteSpace(search))   q = q.Where(x => x.OriginalName.Contains(search) || (x.Description != null && x.Description.Contains(search)));

        var items = await q.OrderByDescending(x => x.CreatedAtUtc).ToListAsync();
        return Ok(items.Select(ToResponse));
    }

    // POST api/documents/upload
    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] string   category    = "Diğer",
        [FromForm] string?  description = null,
        [FromForm] Guid?    patientId   = null)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId) = ctx.Value;

        if (file.Length == 0)         return BadRequest(new { message = "Dosya boş." });
        if (file.Length > MaxFileSize) return BadRequest(new { message = "Dosya 50 MB'ı geçemez." });
        if (!DocumentCategories.All.Contains(category)) category = DocumentCategories.Other;

        // Depolama dizini: uploads/{clinicId}/
        var dir = Path.Combine(UploadsRoot, clinicId.ToString());
        Directory.CreateDirectory(dir);

        var ext        = Path.GetExtension(file.FileName);
        var storedName = $"{Guid.NewGuid()}{ext}";
        var fullPath   = Path.Combine(dir, storedName);

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        var doc = new Document
        {
            ClinicId     = clinicId,
            PatientId    = patientId,
            UploadedById = userId,
            OriginalName = file.FileName,
            StoredName   = storedName,
            Category     = category,
            Description  = description?.Trim(),
            MimeType     = file.ContentType,
            FileSize     = file.Length,
        };

        _db.Documents.Add(doc);
        await _db.SaveChangesAsync();

        var created = await _db.Documents
            .Where(x => x.Id == doc.Id)
            .Include(x => x.Patient).Include(x => x.UploadedBy)
            .FirstAsync();

        return Ok(ToResponse(created));
    }

    // GET api/documents/{id}/download
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var doc = await _db.Documents
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (doc is null) return NotFound();

        var path = Path.Combine(UploadsRoot, clinicId.ToString(), doc.StoredName);
        if (!System.IO.File.Exists(path)) return NotFound(new { message = "Dosya bulunamadı." });

        var bytes = await System.IO.File.ReadAllBytesAsync(path);
        return File(bytes, doc.MimeType, doc.OriginalName);
    }

    // DELETE api/documents/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var doc = await _db.Documents
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (doc is null) return NotFound();

        var path = Path.Combine(UploadsRoot, clinicId.ToString(), doc.StoredName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

        _db.Documents.Remove(doc);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Belge silindi." });
    }
}
