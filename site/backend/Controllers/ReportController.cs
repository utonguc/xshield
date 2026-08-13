using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "SiteAdmin,Manager")]
public class ReportController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);

    // Daire bazlı aidat/borç durumu raporu
    [HttpGet("dues-status")]
    public async Task<IActionResult> DuesStatusReport()
    {
        var site = await db.Sites.FindAsync(SiteId);

        var apartments = await db.Apartments
            .Include(a => a.Block)
            .Include(a => a.Resident)
            .Include(a => a.Owner)
            .Where(a => a.SiteId == SiteId)
            .ToListAsync();

        var records = await db.DuesRecords
            .Include(r => r.DuesPeriod)
            .Where(r => r.SiteId == SiteId)
            .ToListAsync();

        var payments = await db.Payments
            .Where(p => p.SiteId == SiteId)
            .ToListAsync();

        var rows = apartments
            .OrderBy(a => a.Block.Name).ThenBy(a => a.Number)
            .Select(a =>
            {
                var recs = records.Where(r => r.ApartmentId == a.Id).ToList();
                var unpaid = recs
                    .Where(r => r.Status != DuesStatus.Paid && r.Status != DuesStatus.Waived)
                    .OrderBy(r => r.DuesPeriod.Year).ThenBy(r => r.DuesPeriod.Month)
                    .ToList();

                var totalAssessed = recs.Sum(r => r.Amount);
                var totalPaid = recs.Where(r => r.Status == DuesStatus.Paid).Sum(r => r.Amount);
                var totalDebt = unpaid.Sum(r => r.Amount);
                var lastPayment = payments.Where(p => p.ApartmentId == a.Id)
                    .OrderByDescending(p => p.PaidAt).FirstOrDefault();
                var oldest = unpaid.FirstOrDefault();

                var resident = a.Resident?.FullName ?? a.Owner?.FullName;

                return new
                {
                    ApartmentId = a.Id,
                    BlockName = a.Block.Name,
                    Number = a.Number,
                    ResidentName = resident,
                    Phone = a.Resident?.Phone ?? a.Owner?.Phone,
                    TotalRecords = recs.Count,
                    PaidCount = recs.Count(r => r.Status == DuesStatus.Paid),
                    UnpaidMonths = unpaid.Count,
                    TotalAssessed = totalAssessed,
                    TotalPaid = totalPaid,
                    TotalDebt = totalDebt,
                    OldestUnpaidLabel = oldest is null ? null : oldest.DuesPeriod.Title,
                    LastPaymentAt = lastPayment?.PaidAt,
                    Status = totalDebt <= 0
                        ? "Güncel"
                        : (unpaid.Count >= 3 ? "Kritik Borç" : "Borçlu")
                };
            })
            .ToList();

        var summary = new
        {
            SiteName = site?.Name ?? "",
            GeneratedAt = DateTime.UtcNow,
            TotalApartments = rows.Count,
            DebtorCount = rows.Count(r => r.TotalDebt > 0),
            CurrentCount = rows.Count(r => r.TotalDebt <= 0),
            TotalAssessed = rows.Sum(r => r.TotalAssessed),
            TotalCollected = rows.Sum(r => r.TotalPaid),
            TotalDebt = rows.Sum(r => r.TotalDebt)
        };

        return Ok(new { summary, rows });
    }

    // Aylık ödeme çizelgesi (matris): satır=daire, sütun=dönem, hücre=durum
    [HttpGet("dues-matrix")]
    public async Task<IActionResult> DuesMatrix()
    {
        var site = await db.Sites.FindAsync(SiteId);

        var periods = await db.DuesPeriods
            .Where(p => p.SiteId == SiteId)
            .OrderBy(p => p.Year).ThenBy(p => p.Month)
            .Select(p => new { p.Id, p.Title, p.Year, p.Month })
            .ToListAsync();

        var apartments = await db.Apartments
            .Include(a => a.Block)
            .Include(a => a.Resident)
            .Include(a => a.Owner)
            .Where(a => a.SiteId == SiteId)
            .OrderBy(a => a.Block.Name).ThenBy(a => a.Number)
            .ToListAsync();

        var records = await db.DuesRecords
            .Where(r => r.SiteId == SiteId)
            .ToListAsync();

        var rows = apartments.Select(a =>
        {
            var byPeriod = records.Where(r => r.ApartmentId == a.Id)
                .ToDictionary(r => r.DuesPeriodId, r => r);

            var cells = periods.Select(p =>
            {
                if (!byPeriod.TryGetValue(p.Id, out var rec))
                    return new { PeriodId = p.Id, Status = "None", Amount = 0m };
                return new { PeriodId = p.Id, Status = rec.Status.ToString(), Amount = rec.Amount };
            }).ToList();

            var unpaid = cells.Count(c => c.Status is "Pending" or "Overdue");
            var debt = cells.Where(c => c.Status is "Pending" or "Overdue").Sum(c => c.Amount);

            return new
            {
                ApartmentId = a.Id,
                BlockName = a.Block.Name,
                Number = a.Number,
                ResidentName = a.Resident?.FullName ?? a.Owner?.FullName,
                Cells = cells,
                UnpaidCount = unpaid,
                TotalDebt = debt
            };
        }).ToList();

        return Ok(new
        {
            siteName = site?.Name ?? "",
            generatedAt = DateTime.UtcNow,
            periods,
            rows
        });
    }

    // Daire bazlı ödeme geçmişi — tüm ödeme girdileri (aidat + ek ödeme)
    [HttpGet("payment-history")]
    public async Task<IActionResult> PaymentHistory()
    {
        var site = await db.Sites.FindAsync(SiteId);

        var payments = await db.Payments
            .Include(p => p.Apartment).ThenInclude(a => a.Block)
            .Include(p => p.Apartment).ThenInclude(a => a.Resident)
            .Include(p => p.Apartment).ThenInclude(a => a.Owner)
            .Include(p => p.DuesRecord).ThenInclude(r => r!.DuesPeriod)
            .Where(p => p.SiteId == SiteId)
            .OrderBy(p => p.Apartment.Block.Name).ThenBy(p => p.Apartment.Number)
            .ThenByDescending(p => p.PaidAt)
            .ToListAsync();

        // Ek ödeme kaydı id → kampanya başlığı
        var extraMap = await db.ExtraCollectionRecords
            .Include(r => r.ExtraCollection)
            .Where(r => r.SiteId == SiteId)
            .ToDictionaryAsync(r => r.Id, r => r.ExtraCollection.Title);

        var rows = payments.Select(p =>
        {
            string type, source;
            if (p.DuesRecordId != null && p.DuesRecord != null)
            {
                type = "Aidat";
                source = p.DuesRecord.DuesPeriod.Title;
            }
            else if (p.ExtraCollectionRecordId != null && extraMap.TryGetValue(p.ExtraCollectionRecordId.Value, out var t))
            {
                type = "Ek Ödeme";
                source = t;
            }
            else { type = "Diğer"; source = "—"; }

            return new
            {
                PaymentId = p.Id,
                ApartmentId = p.ApartmentId,
                BlockName = p.Apartment.Block.Name,
                Number = p.Apartment.Number,
                ResidentName = p.Apartment.Resident?.FullName ?? p.Apartment.Owner?.FullName,
                Date = p.PaidAt,
                Amount = p.Amount,
                Type = type,
                Source = source,
                Method = p.Method.ToString(),
                ReceiptNo = p.ReceiptNo,
                Note = p.Note
            };
        }).ToList();

        return Ok(new
        {
            siteName = site?.Name ?? "",
            generatedAt = DateTime.UtcNow,
            totalPaid = rows.Sum(r => r.Amount),
            paymentCount = rows.Count,
            rows
        });
    }
}
