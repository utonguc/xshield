using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/visitors")]
[Authorize]
public class VisitorController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Yönetici/güvenlik: tüm ziyaretçiler (filtreli)
    [HttpGet]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? date)
    {
        var q = db.Visitors
            .Include(v => v.Apartment).ThenInclude(a => a!.Block)
            .Where(v => v.SiteId == SiteId);

        if (status == "inside") q = q.Where(v => v.ExitTime == null);
        if (status == "left") q = q.Where(v => v.ExitTime != null);
        if (!string.IsNullOrEmpty(date) && DateOnly.TryParse(date, out var d))
        {
            var start = d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var end = start.AddDays(1);
            q = q.Where(v => v.EntryTime >= start && v.EntryTime < end);
        }

        var items = await q.OrderByDescending(v => v.EntryTime).Select(Map).ToListAsync();
        return Ok(items);
    }

    // Şu an içeride olan ziyaretçi sayısı (dashboard/üst bilgi)
    [HttpGet("inside-count")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> InsideCount()
    {
        var count = await db.Visitors.CountAsync(v => v.SiteId == SiteId && v.ExitTime == null);
        return Ok(new { count });
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateVisitorRequest req)
    {
        if (req.ApartmentId is not null &&
            !await db.Apartments.AnyAsync(a => a.Id == req.ApartmentId && a.SiteId == SiteId))
            return BadRequest("Seçilen daire bulunamadı.");

        var v = new Visitor
        {
            SiteId = SiteId,
            FullName = req.FullName,
            Phone = req.Phone,
            ApartmentId = req.ApartmentId,
            PlateNumber = req.PlateNumber,
            Note = req.Note,
            EntryTime = req.EntryTime?.ToUniversalTime() ?? DateTime.UtcNow,
            CreatedById = UserId
        };
        db.Visitors.Add(v);
        await db.SaveChangesAsync();
        return Ok(await GetDto(v.Id));
    }

    // Çıkış işaretle
    [HttpPost("{id}/exit")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> MarkExit(int id)
    {
        var v = await db.Visitors.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (v is null) return NotFound();
        v.ExitTime = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(await GetDto(id));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateVisitorRequest req)
    {
        var v = await db.Visitors.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (v is null) return NotFound();
        v.FullName = req.FullName;
        v.Phone = req.Phone;
        v.ApartmentId = req.ApartmentId;
        v.PlateNumber = req.PlateNumber;
        v.Note = req.Note;
        if (req.EntryTime.HasValue) v.EntryTime = req.EntryTime.Value.ToUniversalTime();
        v.ExitTime = req.ExitTime?.ToUniversalTime();
        await db.SaveChangesAsync();
        return Ok(await GetDto(id));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var v = await db.Visitors.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (v is null) return NotFound();
        db.Visitors.Remove(v);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Sakin: kendi dairesine gelen ziyaretçiler
    [HttpGet("my")]
    public async Task<IActionResult> My()
    {
        var aptIds = await db.Apartments
            .Where(a => a.SiteId == SiteId && (a.OwnerId == UserId || a.ResidentId == UserId))
            .Select(a => a.Id).ToListAsync();

        var items = await db.Visitors
            .Include(v => v.Apartment).ThenInclude(a => a!.Block)
            .Where(v => v.SiteId == SiteId && v.ApartmentId != null && aptIds.Contains(v.ApartmentId.Value))
            .OrderByDescending(v => v.EntryTime)
            .Select(Map)
            .ToListAsync();
        return Ok(items);
    }

    async Task<VisitorDto> GetDto(int id)
    {
        var v = await db.Visitors.Include(x => x.Apartment).ThenInclude(a => a!.Block).FirstAsync(x => x.Id == id);
        return MapFn(v);
    }

    static readonly System.Linq.Expressions.Expression<Func<Visitor, VisitorDto>> Map = v => new VisitorDto(
        v.Id, v.FullName, v.Phone, v.ApartmentId,
        v.Apartment != null ? v.Apartment.Block.Name + " - " + v.Apartment.Number : null,
        v.PlateNumber, v.Note, v.EntryTime, v.ExitTime, v.ExitTime == null, v.CreatedAt
    );

    static VisitorDto MapFn(Visitor v) => new(
        v.Id, v.FullName, v.Phone, v.ApartmentId,
        v.Apartment != null ? $"{v.Apartment.Block.Name} - {v.Apartment.Number}" : null,
        v.PlateNumber, v.Note, v.EntryTime, v.ExitTime, v.ExitTime == null, v.CreatedAt
    );
}
