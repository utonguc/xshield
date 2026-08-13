using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/dues")]
[Authorize]
public class DuesController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    string UserRole => User.FindFirstValue(ClaimTypes.Role)!;

    // Aidat dönemleri
    [HttpGet("periods")]
    public async Task<IActionResult> ListPeriods()
    {
        var periods = await db.DuesPeriods
            .Where(p => p.SiteId == SiteId)
            .Include(p => p.Records)
            .OrderBy(p => p.Year).ThenBy(p => p.Month)
            .Select(p => new DuesPeriodDto(
                p.Id, p.Title, p.Amount, p.DueDate, p.Year, p.Month, p.Description,
                p.Records.Count,
                p.Records.Count(r => r.Status == DuesStatus.Paid),
                p.Records.Count(r => r.Status == DuesStatus.Pending),
                p.Records.Count(r => r.Status == DuesStatus.Overdue),
                p.Records.Where(r => r.Status == DuesStatus.Paid).Sum(r => r.Amount),
                p.CreatedAt
            ))
            .ToListAsync();
        return Ok(periods);
    }

    [HttpPost("periods")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> CreatePeriod(CreateDuesPeriodRequest req)
    {
        var period = new DuesPeriod
        {
            SiteId = SiteId,
            Title = req.Title,
            Amount = req.Amount,
            DueDate = req.DueDate,
            Year = req.Year,
            Month = req.Month,
            Description = req.Description
        };
        db.DuesPeriods.Add(period);
        await db.SaveChangesAsync();

        // Tüm dairelere otomatik kayıt oluştur.
        // Daire bazlı modda her dairenin kendi MonthlyDues tutarı kullanılır;
        // tanımlı değilse dönemin sabit tutarına düşülür.
        var apartments = await db.Apartments.Where(a => a.SiteId == SiteId).ToListAsync();
        foreach (var apt in apartments)
        {
            var amount = req.PerApartment ? (apt.MonthlyDues ?? req.Amount) : req.Amount;
            db.DuesRecords.Add(new DuesRecord
            {
                DuesPeriodId = period.Id,
                ApartmentId = apt.Id,
                SiteId = SiteId,
                Amount = amount,
                Status = DuesStatus.Pending
            });
        }
        await db.SaveChangesAsync();

        return Ok(period.Id);
    }

    // Dönem düzenle
    [HttpPut("periods/{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> UpdatePeriod(int id, CreateDuesPeriodRequest req)
    {
        var period = await db.DuesPeriods.FirstOrDefaultAsync(p => p.Id == id && p.SiteId == SiteId);
        if (period is null) return NotFound();

        period.Title = req.Title;
        period.DueDate = req.DueDate;
        period.Year = req.Year;
        period.Month = req.Month;
        period.Description = req.Description;

        // Tutar değişirse ödenmemiş kayıtların tutarını da güncelle
        if (period.Amount != req.Amount)
        {
            var unpaid = await db.DuesRecords
                .Where(r => r.DuesPeriodId == id && r.Status == DuesStatus.Pending)
                .ToListAsync();
            unpaid.ForEach(r => r.Amount = req.Amount);
            period.Amount = req.Amount;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Dönem sil
    [HttpDelete("periods/{id}")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> DeletePeriod(int id)
    {
        var period = await db.DuesPeriods.FirstOrDefaultAsync(p => p.Id == id && p.SiteId == SiteId);
        if (period is null) return NotFound();
        db.DuesPeriods.Remove(period);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Ödeme düzenle
    [HttpPut("payments/{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> UpdatePayment(int id, MarkPaidRequest req)
    {
        var payment = await db.Payments
            .FirstOrDefaultAsync(p => p.Id == id && p.SiteId == SiteId);
        if (payment is null) return NotFound();

        payment.Amount = req.Amount;
        payment.Method = req.Method;
        payment.ReceiptNo = req.ReceiptNo;
        payment.Note = req.Note;
        if (req.PaidAt.HasValue) payment.PaidAt = req.PaidAt.Value.ToUniversalTime();
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Ödeme sil — ilgili DuesRecord'ı Pending'e geri döndür
    [HttpDelete("payments/{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> DeletePayment(int id)
    {
        var payment = await db.Payments
            .FirstOrDefaultAsync(p => p.Id == id && p.SiteId == SiteId);
        if (payment is null) return NotFound();

        if (payment.DuesRecordId.HasValue)
        {
            var record = await db.DuesRecords.FindAsync(payment.DuesRecordId.Value);
            if (record is not null)
            {
                record.Status = DuesStatus.Pending;
                record.PaidAt = null;
                record.Note = null;
            }
        }
        db.Payments.Remove(payment);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Bir döneme ait kayıtlar
    [HttpGet("periods/{periodId}/records")]
    public async Task<IActionResult> ListRecords(int periodId)
    {
        var records = await db.DuesRecords
            .Include(r => r.Apartment).ThenInclude(a => a.Block)
            .Include(r => r.DuesPeriod)
            .Where(r => r.DuesPeriodId == periodId && r.SiteId == SiteId)
            .OrderBy(r => r.Apartment.Block.Name).ThenBy(r => r.Apartment.Number)
            .Select(r => new DuesRecordDto(
                r.Id, r.DuesPeriodId, r.DuesPeriod.Title,
                r.ApartmentId, r.Apartment.Number, r.Apartment.Block.Name,
                r.Amount, r.Status.ToString(), r.PaidAt, r.Note
            ))
            .ToListAsync();
        return Ok(records);
    }

    // Aidat ödendi olarak işaretle
    [HttpPost("records/{recordId}/pay")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> MarkPaid(int recordId, MarkPaidRequest req)
    {
        var record = await db.DuesRecords
            .Include(r => r.DuesPeriod)
            .FirstOrDefaultAsync(r => r.Id == recordId && r.SiteId == SiteId);
        if (record is null) return NotFound();

        record.Status = DuesStatus.Paid;
        record.PaidAt = req.PaidAt?.ToUniversalTime() ?? DateTime.UtcNow;
        record.Note = req.Note;

        db.Payments.Add(new Payment
        {
            SiteId = SiteId,
            ApartmentId = record.ApartmentId,
            DuesRecordId = record.Id,
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

    // Bir döneme ait tüm ödemeler (ödeme geçmişi)
    [HttpGet("periods/{periodId}/payments")]
    public async Task<IActionResult> PeriodPayments(int periodId)
    {
        var payments = await db.Payments
            .Include(p => p.Apartment).ThenInclude(a => a.Block)
            .Where(p => p.SiteId == SiteId && p.DuesRecordId != null &&
                db.DuesRecords.Any(r => r.Id == p.DuesRecordId && r.DuesPeriodId == periodId))
            .OrderByDescending(p => p.PaidAt)
            .Select(p => new {
                p.Id, p.Amount, p.PaidAt, p.ReceiptNo, p.Note,
                Method = p.Method.ToString(),
                ApartmentNumber = p.Apartment.Number,
                BlockName = p.Apartment.Block.Name
            })
            .ToListAsync();
        return Ok(payments);
    }

    // Daire bazlı ödeme geçmişi
    [HttpGet("apartment/{apartmentId}/payments")]
    public async Task<IActionResult> ApartmentPayments(int apartmentId)
    {
        var payments = await db.Payments
            .Include(p => p.DuesRecord).ThenInclude(r => r!.DuesPeriod)
            .Where(p => p.SiteId == SiteId && p.ApartmentId == apartmentId)
            .OrderByDescending(p => p.PaidAt)
            .Select(p => new {
                p.Id, p.Amount, p.PaidAt, p.ReceiptNo, p.Note,
                Method = p.Method.ToString(),
                PeriodTitle = p.DuesRecord != null ? p.DuesRecord.DuesPeriod.Title : "Manuel Ödeme"
            })
            .ToListAsync();
        return Ok(payments);
    }

    // Sakin kendi aidatlarını görür
    [HttpGet("my")]
    public async Task<IActionResult> MyDues()
    {
        var apartments = await db.Apartments
            .Where(a => a.SiteId == SiteId && (a.OwnerId == UserId || a.ResidentId == UserId))
            .Select(a => a.Id)
            .ToListAsync();

        var records = await db.DuesRecords
            .Include(r => r.DuesPeriod)
            .Where(r => apartments.Contains(r.ApartmentId))
            .OrderByDescending(r => r.DuesPeriod.Year).ThenByDescending(r => r.DuesPeriod.Month)
            .Select(r => new ResidentDuesDto(
                r.DuesPeriodId, r.DuesPeriod.Title,
                r.DuesPeriod.Year, r.DuesPeriod.Month,
                r.Amount, r.Status.ToString(), r.PaidAt, r.DuesPeriod.DueDate
            ))
            .ToListAsync();

        return Ok(records);
    }
}
