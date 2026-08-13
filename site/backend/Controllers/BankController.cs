using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/banks")]
[Authorize]
public class BankController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await db.Banks
            .Where(b => b.SiteId == SiteId)
            .OrderByDescending(b => b.IsDefault).ThenBy(b => b.BankName)
            .ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateBankRequest req)
    {
        if (req.IsDefault)
            await ClearDefaults();

        var bank = new Bank
        {
            SiteId = SiteId,
            BankName = req.BankName,
            AccountName = req.AccountName,
            Iban = req.Iban,
            Branch = req.Branch,
            AccountNo = req.AccountNo,
            IsDefault = req.IsDefault
        };
        db.Banks.Add(bank);
        await db.SaveChangesAsync();
        return Ok(Map(bank));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateBankRequest req)
    {
        var bank = await db.Banks.FirstOrDefaultAsync(b => b.Id == id && b.SiteId == SiteId);
        if (bank is null) return NotFound();

        if (req.IsDefault && !bank.IsDefault)
            await ClearDefaults();

        bank.BankName = req.BankName;
        bank.AccountName = req.AccountName;
        bank.Iban = req.Iban;
        bank.Branch = req.Branch;
        bank.AccountNo = req.AccountNo;
        bank.IsDefault = req.IsDefault;
        await db.SaveChangesAsync();
        return Ok(Map(bank));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var bank = await db.Banks.FirstOrDefaultAsync(b => b.Id == id && b.SiteId == SiteId);
        if (bank is null) return NotFound();
        db.Banks.Remove(bank);
        await db.SaveChangesAsync();
        return NoContent();
    }

    async Task ClearDefaults()
    {
        var defaults = await db.Banks.Where(b => b.SiteId == SiteId && b.IsDefault).ToListAsync();
        defaults.ForEach(b => b.IsDefault = false);
        await db.SaveChangesAsync();
    }

    static BankDto Map(Bank b) => new(
        b.Id, b.BankName, b.AccountName, b.Iban,
        b.Branch, b.AccountNo, b.IsDefault, b.CreatedAt
    );
}
