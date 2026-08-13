using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/expenses")]
[Authorize]
public class ExpenseController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? year, [FromQuery] int? month)
    {
        var q = db.Expenses.Where(e => e.SiteId == SiteId);
        if (year.HasValue)  q = q.Where(e => e.ExpenseDate.Year == year.Value);
        if (month.HasValue) q = q.Where(e => e.ExpenseDate.Month == month.Value);

        var items = await q.OrderByDescending(e => e.ExpenseDate).ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateExpenseRequest req)
    {
        var expense = new Expense
        {
            SiteId = SiteId,
            Title = req.Title,
            Amount = req.Amount,
            Category = req.Category,
            Description = req.Description,
            ExpenseDate = req.ExpenseDate.ToUniversalTime(),
            ReceiptNo = req.ReceiptNo,
            CreatedById = UserId
        };
        db.Expenses.Add(expense);
        await db.SaveChangesAsync();
        return Ok(Map(expense));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, CreateExpenseRequest req)
    {
        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.SiteId == SiteId);
        if (expense is null) return NotFound();

        expense.Title = req.Title;
        expense.Amount = req.Amount;
        expense.Category = req.Category;
        expense.Description = req.Description;
        expense.ExpenseDate = req.ExpenseDate.ToUniversalTime();
        expense.ReceiptNo = req.ReceiptNo;
        await db.SaveChangesAsync();
        return Ok(Map(expense));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.SiteId == SiteId);
        if (expense is null) return NotFound();
        db.Expenses.Remove(expense);
        await db.SaveChangesAsync();
        return NoContent();
    }

    static ExpenseDto Map(Expense e) => new(
        e.Id, e.Title, e.Amount, e.Category.ToString(),
        e.Description, e.ExpenseDate, e.ReceiptNo, e.CreatedById, e.CreatedAt
    );
}
