using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/issues")]
[Authorize]
public class IssueController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    string UserRole => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? priority)
    {
        var q = db.Issues
            .Include(i => i.Apartment).ThenInclude(a => a!.Block)
            .Include(i => i.CreatedBy)
            .Include(i => i.AssignedTo)
            .Where(i => i.SiteId == SiteId);

        // Sakinler sadece kendi bildirdiklerini görür
        if (UserRole == "Resident")
            q = q.Where(i => i.CreatedById == UserId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<IssueStatus>(status, out var s))
            q = q.Where(i => i.Status == s);
        if (!string.IsNullOrEmpty(priority) && Enum.TryParse<IssuePriority>(priority, out var p))
            q = q.Where(i => i.Priority == p);

        var items = await q.OrderByDescending(i => i.CreatedAt).ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var issue = await db.Issues
            .Include(i => i.Apartment).ThenInclude(a => a!.Block)
            .Include(i => i.CreatedBy)
            .Include(i => i.AssignedTo)
            .FirstOrDefaultAsync(i => i.Id == id && i.SiteId == SiteId);
        return issue is null ? NotFound() : Ok(Map(issue));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateIssueRequest req)
    {
        var issue = new Issue
        {
            SiteId = SiteId,
            Title = req.Title,
            Description = req.Description,
            Priority = req.Priority,
            Category = req.Category,
            ApartmentId = req.ApartmentId,
            CreatedById = UserId
        };
        db.Issues.Add(issue);
        await db.SaveChangesAsync();
        return Ok(await GetDto(issue.Id));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateIssueRequest req)
    {
        var issue = await db.Issues.FirstOrDefaultAsync(i => i.Id == id && i.SiteId == SiteId);
        if (issue is null) return NotFound();

        issue.Title = req.Title;
        issue.Description = req.Description;
        issue.Status = req.Status;
        issue.Priority = req.Priority;
        issue.Category = req.Category;
        issue.AssignedToId = req.AssignedToId;
        issue.Resolution = req.Resolution;
        issue.UpdatedAt = DateTime.UtcNow;

        if (req.Status == IssueStatus.Resolved && issue.ResolvedAt is null)
            issue.ResolvedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(await GetDto(id));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var issue = await db.Issues.FirstOrDefaultAsync(i => i.Id == id && i.SiteId == SiteId);
        if (issue is null) return NotFound();
        db.Issues.Remove(issue);
        await db.SaveChangesAsync();
        return NoContent();
    }

    async Task<IssueDto> GetDto(int id)
    {
        var i = await db.Issues
            .Include(i => i.Apartment).ThenInclude(a => a!.Block)
            .Include(i => i.CreatedBy)
            .Include(i => i.AssignedTo)
            .FirstAsync(i => i.Id == id);
        return Map(i);
    }

    static IssueDto Map(Issue i) => new(
        i.Id, i.Title, i.Description,
        i.Status.ToString(), i.Priority.ToString(), i.Category.ToString(),
        i.ApartmentId, i.Apartment?.Number, i.Apartment?.Block?.Name,
        i.CreatedById, i.CreatedBy.FullName,
        i.AssignedToId, i.AssignedTo?.FullName,
        i.Resolution, i.ResolvedAt, i.CreatedAt, i.UpdatedAt
    );
}
