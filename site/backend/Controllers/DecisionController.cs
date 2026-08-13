using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/decisions")]
[Authorize]
public class DecisionController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Tüm sakinler görebilir (şeffaflık)
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await db.Decisions
            .Where(d => d.SiteId == SiteId)
            .OrderByDescending(d => d.Number)
            .Select(d => new DecisionDto(
                d.Id, d.Number, d.Title, d.Content, d.DecisionDate,
                d.Result.ToString(), d.MeetingId, d.CreatedAt))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateDecisionRequest req)
    {
        var lastNo = await db.Decisions.Where(d => d.SiteId == SiteId)
            .MaxAsync(d => (int?)d.Number) ?? 0;
        var dec = new Decision
        {
            SiteId = SiteId,
            Number = lastNo + 1,
            Title = req.Title,
            Content = req.Content,
            DecisionDate = req.DecisionDate,
            Result = req.Result,
            MeetingId = req.MeetingId,
            CreatedById = UserId
        };
        db.Decisions.Add(dec);
        await db.SaveChangesAsync();
        return Ok(new DecisionDto(dec.Id, dec.Number, dec.Title, dec.Content, dec.DecisionDate, dec.Result.ToString(), dec.MeetingId, dec.CreatedAt));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, CreateDecisionRequest req)
    {
        var dec = await db.Decisions.FirstOrDefaultAsync(d => d.Id == id && d.SiteId == SiteId);
        if (dec is null) return NotFound();
        dec.Title = req.Title;
        dec.Content = req.Content;
        dec.DecisionDate = req.DecisionDate;
        dec.Result = req.Result;
        dec.MeetingId = req.MeetingId;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var dec = await db.Decisions.FirstOrDefaultAsync(d => d.Id == id && d.SiteId == SiteId);
        if (dec is null) return NotFound();
        db.Decisions.Remove(dec);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
