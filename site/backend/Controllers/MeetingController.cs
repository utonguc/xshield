using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/meetings")]
[Authorize]
public class MeetingController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var q = db.Meetings.Where(m => m.SiteId == SiteId);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<MeetingStatus>(status, out var s))
            q = q.Where(m => m.Status == s);

        var items = await q.OrderByDescending(m => m.MeetingDate).ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var m = await db.Meetings.FirstOrDefaultAsync(m => m.Id == id && m.SiteId == SiteId);
        return m is null ? NotFound() : Ok(Map(m));
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateMeetingRequest req)
    {
        var meeting = new Meeting
        {
            SiteId = SiteId,
            Title = req.Title,
            Description = req.Description,
            Agenda = req.Agenda,
            MeetingDate = req.MeetingDate.ToUniversalTime(),
            Location = req.Location,
            CreatedById = UserId
        };
        db.Meetings.Add(meeting);
        await db.SaveChangesAsync();
        return Ok(Map(meeting));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Update(int id, UpdateMeetingRequest req)
    {
        var meeting = await db.Meetings.FirstOrDefaultAsync(m => m.Id == id && m.SiteId == SiteId);
        if (meeting is null) return NotFound();

        meeting.Title = req.Title;
        meeting.Description = req.Description;
        meeting.Agenda = req.Agenda;
        meeting.MeetingDate = req.MeetingDate.ToUniversalTime();
        meeting.Location = req.Location;
        meeting.Status = req.Status;
        meeting.Minutes = req.Minutes;
        await db.SaveChangesAsync();
        return Ok(Map(meeting));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var meeting = await db.Meetings.FirstOrDefaultAsync(m => m.Id == id && m.SiteId == SiteId);
        if (meeting is null) return NotFound();
        db.Meetings.Remove(meeting);
        await db.SaveChangesAsync();
        return NoContent();
    }

    static MeetingDto Map(Meeting m) => new(
        m.Id, m.Title, m.Description, m.Agenda, m.MeetingDate,
        m.Location, m.Status.ToString(), m.Minutes, m.CreatedById, m.CreatedAt
    );
}
