using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/parking")]
[Authorize]
public class ParkingController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> List([FromQuery] string? type, [FromQuery] string? search)
    {
        var q = db.ParkingPermits
            .Include(p => p.Apartment).ThenInclude(a => a!.Block)
            .Where(p => p.SiteId == SiteId);

        if (!string.IsNullOrEmpty(type) && Enum.TryParse<PermitType>(type, out var t))
            q = q.Where(p => p.PermitType == t);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var n = ParkingPermit.Normalize(search);
            q = q.Where(p => p.PlateNormalized.Contains(n) ||
                             (p.OwnerName != null && p.OwnerName.ToLower().Contains(search.ToLower())));
        }

        var items = await q.OrderBy(p => p.PlateNumber).ToListAsync();
        return Ok(items.Select(Map));
    }

    // Kapı sorgusu: plaka yetkili mi?
    [HttpGet("check")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Check([FromQuery] string plate)
    {
        if (string.IsNullOrWhiteSpace(plate))
            return Ok(new ParkingCheckResult(false, "", null, "Plaka giriniz."));

        var norm = ParkingPermit.Normalize(plate);
        var permit = await db.ParkingPermits
            .Include(p => p.Apartment).ThenInclude(a => a!.Block)
            .FirstOrDefaultAsync(p => p.SiteId == SiteId && p.PlateNormalized == norm);

        if (permit is null)
            return Ok(new ParkingCheckResult(false, plate, null, "❌ Bu plaka kayıtlı değil — giriş izni YOK."));
        if (!permit.IsActive)
            return Ok(new ParkingCheckResult(false, plate, Map(permit), "⛔ Plaka kayıtlı ama izni PASİF."));
        if (permit.ValidUntil.HasValue && permit.ValidUntil.Value < DateOnly.FromDateTime(DateTime.UtcNow))
            return Ok(new ParkingCheckResult(false, plate, Map(permit), $"⛔ İzin süresi dolmuş ({permit.ValidUntil:dd.MM.yyyy})."));

        return Ok(new ParkingCheckResult(true, plate, Map(permit), "✅ Giriş izni VAR."));
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateParkingPermitRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.PlateNumber))
            return BadRequest("Plaka zorunludur.");
        if (req.ApartmentId is not null &&
            !await db.Apartments.AnyAsync(a => a.Id == req.ApartmentId && a.SiteId == SiteId))
            return BadRequest("Seçilen daire bulunamadı.");

        var norm = ParkingPermit.Normalize(req.PlateNumber);
        if (await db.ParkingPermits.AnyAsync(p => p.SiteId == SiteId && p.PlateNormalized == norm))
            return BadRequest("Bu plaka zaten kayıtlı.");

        var p = new ParkingPermit
        {
            SiteId = SiteId,
            PlateNumber = req.PlateNumber.Trim().ToUpperInvariant(),
            PlateNormalized = norm,
            OwnerName = req.OwnerName,
            ApartmentId = req.ApartmentId,
            VehicleInfo = req.VehicleInfo,
            PermitType = req.PermitType,
            ValidUntil = req.ValidUntil,
            Note = req.Note,
            CreatedById = UserId
        };
        db.ParkingPermits.Add(p);
        await db.SaveChangesAsync();
        return Ok(await GetDto(p.Id));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, CreateParkingPermitRequest req)
    {
        var p = await db.ParkingPermits.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (p is null) return NotFound();

        var norm = ParkingPermit.Normalize(req.PlateNumber);
        if (await db.ParkingPermits.AnyAsync(x => x.SiteId == SiteId && x.PlateNormalized == norm && x.Id != id))
            return BadRequest("Bu plaka başka bir kayıtta mevcut.");

        p.PlateNumber = req.PlateNumber.Trim().ToUpperInvariant();
        p.PlateNormalized = norm;
        p.OwnerName = req.OwnerName;
        p.ApartmentId = req.ApartmentId;
        p.VehicleInfo = req.VehicleInfo;
        p.PermitType = req.PermitType;
        p.ValidUntil = req.ValidUntil;
        p.Note = req.Note;
        await db.SaveChangesAsync();
        return Ok(await GetDto(id));
    }

    [HttpPost("{id}/toggle")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Toggle(int id)
    {
        var p = await db.ParkingPermits.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (p is null) return NotFound();
        p.IsActive = !p.IsActive;
        await db.SaveChangesAsync();
        return Ok(await GetDto(id));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var p = await db.ParkingPermits.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (p is null) return NotFound();
        db.ParkingPermits.Remove(p);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Sakin: kendi dairesine kayıtlı plakalar
    [HttpGet("my")]
    public async Task<IActionResult> My()
    {
        var aptIds = await db.Apartments
            .Where(a => a.SiteId == SiteId && (a.OwnerId == UserId || a.ResidentId == UserId))
            .Select(a => a.Id).ToListAsync();

        var items = await db.ParkingPermits
            .Include(p => p.Apartment).ThenInclude(a => a!.Block)
            .Where(p => p.SiteId == SiteId && p.ApartmentId != null && aptIds.Contains(p.ApartmentId.Value))
            .OrderBy(p => p.PlateNumber)
            .ToListAsync();
        return Ok(items.Select(Map));
    }

    async Task<ParkingPermitDto> GetDto(int id)
    {
        var p = await db.ParkingPermits.Include(x => x.Apartment).ThenInclude(a => a!.Block).FirstAsync(x => x.Id == id);
        return Map(p);
    }

    static ParkingPermitDto Map(ParkingPermit p) => new(
        p.Id, p.PlateNumber, p.OwnerName, p.ApartmentId,
        p.Apartment != null ? $"{p.Apartment.Block.Name} - {p.Apartment.Number}" : null,
        p.VehicleInfo, p.PermitType.ToString(), p.ValidUntil, p.IsActive,
        p.ValidUntil.HasValue && p.ValidUntil.Value < DateOnly.FromDateTime(DateTime.UtcNow),
        p.Note, p.CreatedAt
    );
}
