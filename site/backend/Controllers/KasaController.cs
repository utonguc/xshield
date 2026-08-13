using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/kasa")]
[Authorize]
public class KasaController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);

    [HttpGet]
    public async Task<IActionResult> Summary([FromQuery] int? year, [FromQuery] int? month)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Gelirler (tüm zamanlar)
        var totalIncome = await db.Payments.Where(p => p.SiteId == SiteId).SumAsync(p => (decimal?)p.Amount) ?? 0;
        var totalExpense = await db.Expenses.Where(e => e.SiteId == SiteId).SumAsync(e => (decimal?)e.Amount) ?? 0;

        // Bu ay
        var thisMonthIncome = await db.Payments
            .Where(p => p.SiteId == SiteId && p.PaidAt >= startOfMonth)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;
        var thisMonthExpense = await db.Expenses
            .Where(e => e.SiteId == SiteId && e.ExpenseDate >= startOfMonth)
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        // Hareketler — filtreleme uygulanabilir
        var payQ = db.Payments
            .Include(p => p.Apartment).ThenInclude(a => a.Block)
            .Include(p => p.DuesRecord).ThenInclude(r => r!.DuesPeriod)
            .Where(p => p.SiteId == SiteId);
        var expQ = db.Expenses.Where(e => e.SiteId == SiteId);

        if (year.HasValue)
        {
            payQ = payQ.Where(p => p.PaidAt.Year == year.Value);
            expQ = expQ.Where(e => e.ExpenseDate.Year == year.Value);
        }
        if (month.HasValue)
        {
            payQ = payQ.Where(p => p.PaidAt.Month == month.Value);
            expQ = expQ.Where(e => e.ExpenseDate.Month == month.Value);
        }

        var payments = await payQ.ToListAsync();
        var expenses = await expQ.ToListAsync();

        var transactions = payments
            .Select(p => new KasaTransactionDto(
                p.Id, "income",
                p.DuesRecord != null ? p.DuesRecord.DuesPeriod.Title : "Ödeme",
                p.Amount, $"{p.Apartment.Block.Name} · D.{p.Apartment.Number}",
                p.PaidAt, p.Note, p.ReceiptNo
            ))
            .Concat(expenses.Select(e => new KasaTransactionDto(
                e.Id, "expense",
                e.Title, e.Amount, e.Category.ToString(),
                e.ExpenseDate, e.Description, e.ReceiptNo
            )))
            .OrderByDescending(t => t.Date)
            .ToList();

        return Ok(new KasaDto(totalIncome, totalExpense, totalIncome - totalExpense,
            thisMonthIncome, thisMonthExpense, transactions));
    }
}
