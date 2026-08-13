using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;
using SitePlatform.Api.Services;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/apartments")]
[Authorize]
public class ApartmentController(AppDbContext db, SubscriptionService subscription) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? blockId, [FromQuery] string? status)
    {
        var q = db.Apartments
            .Include(a => a.Block)
            .Include(a => a.Owner)
            .Include(a => a.Resident)
            .Where(a => a.SiteId == SiteId);

        if (blockId.HasValue) q = q.Where(a => a.BlockId == blockId.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ApartmentStatus>(status, out var s))
            q = q.Where(a => a.Status == s);

        var items = await q.OrderBy(a => a.Block.Name).ThenBy(a => a.Number).ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var a = await db.Apartments
            .Include(a => a.Block)
            .Include(a => a.Owner)
            .Include(a => a.Resident)
            .FirstOrDefaultAsync(a => a.Id == id && a.SiteId == SiteId);
        return a is null ? NotFound() : Ok(Map(a));
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateApartmentRequest req)
    {
        var block = await db.Blocks.FirstOrDefaultAsync(b => b.Id == req.BlockId && b.SiteId == SiteId);
        if (block is null) return BadRequest("Blok bulunamadı.");

        var site = await db.Sites.FindAsync(SiteId);
        var currentCount = await db.Apartments.CountAsync(a => a.SiteId == SiteId);
        var limit = SubscriptionService.GetApartmentLimit(site!.Tier);
        if (currentCount >= limit)
            return BadRequest($"Mevcut planınız ({site.Tier}) en fazla {limit} daireye izin vermektedir. Daha fazla daire eklemek için planınızı yükseltin.");

        // Yeni daire oluşturulurken henüz sakin atanmadığı için 'Dolu' seçilemez
        var initialStatus = req.Status == ApartmentStatus.Occupied ? ApartmentStatus.Empty : req.Status;

        var apt = new Apartment
        {
            SiteId = SiteId,
            BlockId = req.BlockId,
            Number = req.Number,
            Floor = req.Floor,
            Type = req.Type,
            SquareMeters = req.SquareMeters,
            LandShare = req.LandShare,
            MonthlyDues = req.MonthlyDues,
            Status = initialStatus
        };
        db.Apartments.Add(apt);
        await db.SaveChangesAsync();

        // Mevcut tüm dönemlere bu daire için kayıt aç (daireye özel tutar varsa onu kullan)
        var existingPeriods = await db.DuesPeriods.Where(p => p.SiteId == SiteId).ToListAsync();
        foreach (var period in existingPeriods)
        {
            var alreadyExists = await db.DuesRecords.AnyAsync(r => r.DuesPeriodId == period.Id && r.ApartmentId == apt.Id);
            if (!alreadyExists)
                db.DuesRecords.Add(new DuesRecord
                {
                    DuesPeriodId = period.Id,
                    ApartmentId = apt.Id,
                    SiteId = SiteId,
                    Amount = apt.MonthlyDues ?? period.Amount,
                    Status = DuesStatus.Pending
                });
        }
        if (existingPeriods.Count > 0)
            await db.SaveChangesAsync();
        await subscription.RefreshSiteTierAsync(SiteId);

        return Ok(await GetDto(apt.Id));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateApartmentRequest req)
    {
        var apt = await db.Apartments.FirstOrDefaultAsync(a => a.Id == id && a.SiteId == SiteId);
        if (apt is null) return NotFound();

        // Durum tutarlılığı:
        //  - Dolu ise mutlaka bir sakin atanmalı (kimse yaşamıyorsa dolu olamaz)
        //  - Sakin yoksa durum Boş/Kiralık/Satılık olmalı
        if (req.Status == ApartmentStatus.Occupied && req.ResidentId is null)
            return BadRequest("Daireyi 'Dolu' olarak işaretlemek için bir sakin seçmelisiniz. Kimse yaşamıyorsa Boş, Kiralık veya Satılık seçin.");

        if (req.Status != ApartmentStatus.Occupied && req.ResidentId is not null)
            return BadRequest("Daireye sakin atadıysanız durumu 'Dolu' olarak seçmelisiniz.");

        // Atanan kişiler bu siteye ait olmalı (geçersiz id'de temiz hata)
        if (req.OwnerId is not null &&
            !await db.Users.AnyAsync(u => u.Id == req.OwnerId && u.SiteId == SiteId))
            return BadRequest("Seçilen mal sahibi bulunamadı.");
        if (req.ResidentId is not null &&
            !await db.Users.AnyAsync(u => u.Id == req.ResidentId && u.SiteId == SiteId))
            return BadRequest("Seçilen sakin bulunamadı.");

        apt.Number = req.Number;
        apt.Floor = req.Floor;
        apt.Type = req.Type;
        apt.SquareMeters = req.SquareMeters;
        apt.LandShare = req.LandShare;
        apt.MonthlyDues = req.MonthlyDues;
        apt.Status = req.Status;
        apt.OwnerId = req.OwnerId;
        apt.ResidentId = req.ResidentId;
        await db.SaveChangesAsync();

        return Ok(await GetDto(id));
    }

    // Formülle aidat hesapla: her daire için MonthlyDues = site.taban + arsaPayı × blok.çarpan
    [HttpPost("calculate-dues")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> CalculateDues(CalculateDuesRequest req)
    {
        var site = await db.Sites.FindAsync(SiteId);
        if (site is null) return NotFound();

        // Taban gönderildiyse site tabanını güncelle (kalıcı)
        if (req.BaseAmount.HasValue)
            site.DuesBaseAmount = req.BaseAmount.Value;

        var apartments = await db.Apartments
            .Include(a => a.Block)
            .Where(a => a.SiteId == SiteId)
            .ToListAsync();

        int updated = 0, skipped = 0;
        foreach (var a in apartments)
        {
            // Arsa payı tanımlı değilse atla
            if (a.LandShare is null) { skipped++; continue; }
            // Üzerine yazma kapalıysa ve zaten tutar varsa atla
            if (!req.Overwrite && a.MonthlyDues is not null) continue;

            var amount = site.DuesBaseAmount + (a.LandShare.Value * a.Block.DuesCoefficient);
            if (req.RoundTo > 0)
                amount = Math.Round(amount / req.RoundTo, MidpointRounding.AwayFromZero) * req.RoundTo;

            a.MonthlyDues = amount;
            updated++;
        }
        await db.SaveChangesAsync();
        return Ok(new CalculateDuesResult(updated, skipped, site.DuesBaseAmount));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var apt = await db.Apartments.FirstOrDefaultAsync(a => a.Id == id && a.SiteId == SiteId);
        if (apt is null) return NotFound();
        db.Apartments.Remove(apt);
        await db.SaveChangesAsync();
        await subscription.RefreshSiteTierAsync(SiteId);
        return NoContent();
    }

    async Task<ApartmentDto> GetDto(int id)
    {
        var a = await db.Apartments
            .Include(a => a.Block)
            .Include(a => a.Owner)
            .Include(a => a.Resident)
            .FirstAsync(a => a.Id == id);
        return Map(a);
    }

    static ApartmentDto Map(Apartment a) => new(
        a.Id, a.BlockId, a.Block.Name, a.Number, a.Floor, a.Type, a.SquareMeters,
        a.LandShare, a.MonthlyDues,
        a.Status.ToString(),
        a.OwnerId, a.Owner?.FullName, a.Owner?.Phone,
        a.ResidentId, a.Resident?.FullName, a.Resident?.Phone,
        a.CreatedAt
    );
}
