using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/extra-collections")]
[Authorize]
public class ExtraCollectionController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> List()
    {
        var items = await db.ExtraCollections
            .Where(c => c.SiteId == SiteId)
            .Include(c => c.Records)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ExtraCollectionDto(
                c.Id, c.Title, c.Description, c.Amount, c.DueDate,
                c.Records.Count,
                c.Records.Count(r => r.Status == DuesStatus.Paid),
                c.Records.Count(r => r.Status != DuesStatus.Paid && r.Status != DuesStatus.Waived),
                c.Records.Sum(r => r.Amount),
                c.Records.Where(r => r.Status == DuesStatus.Paid).Sum(r => r.Amount),
                c.CreatedAt
            ))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateExtraCollectionRequest req)
    {
        if (req.ApartmentIds is null || req.ApartmentIds.Count == 0)
            return BadRequest("En az bir daire seçmelisiniz.");

        // Sadece bu siteye ait daireler
        var validIds = await db.Apartments
            .Where(a => a.SiteId == SiteId && req.ApartmentIds.Contains(a.Id))
            .Select(a => a.Id)
            .ToListAsync();
        if (validIds.Count == 0) return BadRequest("Geçerli daire bulunamadı.");

        var collection = new ExtraCollection
        {
            SiteId = SiteId,
            Title = req.Title,
            Description = req.Description,
            Amount = req.Amount,
            DueDate = req.DueDate,
            CreatedById = UserId
        };
        db.ExtraCollections.Add(collection);
        await db.SaveChangesAsync();

        foreach (var aptId in validIds)
            db.ExtraCollectionRecords.Add(new ExtraCollectionRecord
            {
                ExtraCollectionId = collection.Id,
                ApartmentId = aptId,
                SiteId = SiteId,
                Amount = req.Amount,
                Status = DuesStatus.Pending
            });
        await db.SaveChangesAsync();

        return Ok(new { id = collection.Id, count = validIds.Count });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateExtraCollectionRequest req)
    {
        var c = await db.ExtraCollections.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (c is null) return NotFound();
        c.Title = req.Title;
        c.Description = req.Description;
        c.DueDate = req.DueDate;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var c = await db.ExtraCollections.FirstOrDefaultAsync(x => x.Id == id && x.SiteId == SiteId);
        if (c is null) return NotFound();
        db.ExtraCollections.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/records")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Records(int id)
    {
        var records = await db.ExtraCollectionRecords
            .Include(r => r.Apartment).ThenInclude(a => a.Block)
            .Include(r => r.Apartment).ThenInclude(a => a.Resident)
            .Include(r => r.Apartment).ThenInclude(a => a.Owner)
            .Where(r => r.ExtraCollectionId == id && r.SiteId == SiteId)
            .OrderBy(r => r.Apartment.Block.Name).ThenBy(r => r.Apartment.Number)
            .ToListAsync();

        var dto = records.Select(r => new ExtraCollectionRecordDto(
            r.Id, r.ApartmentId, r.Apartment.Number, r.Apartment.Block.Name,
            r.Apartment.Resident?.FullName ?? r.Apartment.Owner?.FullName,
            r.Amount, r.Status.ToString(), r.PaidAt, r.Note
        ));
        return Ok(dto);
    }

    [HttpPost("records/{recordId}/pay")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Pay(int recordId, PayExtraRequest req)
    {
        var record = await db.ExtraCollectionRecords
            .FirstOrDefaultAsync(r => r.Id == recordId && r.SiteId == SiteId);
        if (record is null) return NotFound();

        record.Status = DuesStatus.Paid;
        record.PaidAt = req.PaidAt?.ToUniversalTime() ?? DateTime.UtcNow;
        record.Note = req.Note;

        // Kasa'ya gelir olarak işlensin
        db.Payments.Add(new Payment
        {
            SiteId = SiteId,
            ApartmentId = record.ApartmentId,
            ExtraCollectionRecordId = record.Id,
            Amount = req.Amount,
            PaidAt = record.PaidAt.Value,
            Method = req.Method,
            ReceiptNo = req.ReceiptNo,
            Note = req.Note,
            CreatedById = UserId
        });
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Ödemeyi geri al (Pending'e döndür, ilgili Payment sil)
    [HttpDelete("records/{recordId}/pay")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> UndoPay(int recordId)
    {
        var record = await db.ExtraCollectionRecords
            .FirstOrDefaultAsync(r => r.Id == recordId && r.SiteId == SiteId);
        if (record is null) return NotFound();

        var payments = await db.Payments
            .Where(p => p.ExtraCollectionRecordId == recordId).ToListAsync();
        db.Payments.RemoveRange(payments);

        record.Status = DuesStatus.Pending;
        record.PaidAt = null;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Sakin kendi ek ödemelerini görür
    [HttpGet("my")]
    public async Task<IActionResult> My()
    {
        var aptIds = await db.Apartments
            .Where(a => a.SiteId == SiteId && (a.OwnerId == UserId || a.ResidentId == UserId))
            .Select(a => a.Id).ToListAsync();

        var records = await db.ExtraCollectionRecords
            .Include(r => r.ExtraCollection)
            .Where(r => aptIds.Contains(r.ApartmentId))
            .OrderByDescending(r => r.ExtraCollection.CreatedAt)
            .Select(r => new ResidentExtraDto(
                r.ExtraCollectionId, r.ExtraCollection.Title, r.ExtraCollection.Description,
                r.Amount, r.Status.ToString(), r.PaidAt, r.ExtraCollection.DueDate
            ))
            .ToListAsync();
        return Ok(records);
    }
}
