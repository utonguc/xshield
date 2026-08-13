using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/surveys")]
[Authorize]
public class SurveyController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);
    int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var surveys = await db.Surveys
            .Include(s => s.Options)
            .Include(s => s.Votes)
            .Where(s => s.SiteId == SiteId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
        return Ok(surveys.Select(Map));
    }

    [HttpPost]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Create(CreateSurveyRequest req)
    {
        var opts = (req.Options ?? []).Where(o => !string.IsNullOrWhiteSpace(o)).ToList();
        if (opts.Count < 2) return BadRequest("En az 2 seçenek girmelisiniz.");

        var survey = new Survey
        {
            SiteId = SiteId,
            Question = req.Question,
            Description = req.Description,
            EndsAt = req.EndsAt?.ToUniversalTime(),
            CreatedById = UserId,
            Options = opts.Select(o => new SurveyOption { Text = o.Trim() }).ToList()
        };
        db.Surveys.Add(survey);
        await db.SaveChangesAsync();

        var full = await db.Surveys.Include(s => s.Options).Include(s => s.Votes).FirstAsync(s => s.Id == survey.Id);
        return Ok(Map(full));
    }

    [HttpPost("{id}/vote")]
    public async Task<IActionResult> Vote(int id, CastSurveyVoteRequest req)
    {
        var survey = await db.Surveys.Include(s => s.Options).Include(s => s.Votes)
            .FirstOrDefaultAsync(s => s.Id == id && s.SiteId == SiteId);
        if (survey is null) return NotFound();
        if (survey.IsClosed || (survey.EndsAt.HasValue && survey.EndsAt < DateTime.UtcNow))
            return BadRequest("Bu anket kapanmış.");
        if (!survey.Options.Any(o => o.Id == req.OptionId))
            return BadRequest("Geçersiz seçenek.");

        var existing = survey.Votes.FirstOrDefault(v => v.UserId == UserId);
        if (existing is not null) existing.OptionId = req.OptionId;
        else db.SurveyVotes.Add(new SurveyVote { SurveyId = id, OptionId = req.OptionId, UserId = UserId });

        await db.SaveChangesAsync();
        var full = await db.Surveys.Include(s => s.Options).Include(s => s.Votes).FirstAsync(s => s.Id == id);
        return Ok(Map(full));
    }

    [HttpPost("{id}/close")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Close(int id)
    {
        var survey = await db.Surveys.FirstOrDefaultAsync(s => s.Id == id && s.SiteId == SiteId);
        if (survey is null) return NotFound();
        survey.IsClosed = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin,Manager")]
    public async Task<IActionResult> Delete(int id)
    {
        var survey = await db.Surveys.FirstOrDefaultAsync(s => s.Id == id && s.SiteId == SiteId);
        if (survey is null) return NotFound();
        db.Surveys.Remove(survey);
        await db.SaveChangesAsync();
        return NoContent();
    }

    SurveyDto Map(Survey s)
    {
        var total = s.Votes.Count;
        var myVote = s.Votes.FirstOrDefault(v => v.UserId == UserId);
        var closed = s.IsClosed || (s.EndsAt.HasValue && s.EndsAt < DateTime.UtcNow);
        var options = s.Options.Select(o =>
        {
            var cnt = s.Votes.Count(v => v.OptionId == o.Id);
            return new SurveyOptionDto(o.Id, o.Text, cnt, total > 0 ? Math.Round((double)cnt / total * 100, 1) : 0);
        }).ToList();
        return new SurveyDto(s.Id, s.Question, s.Description, closed, s.EndsAt, total,
            myVote?.OptionId, options, s.CreatedAt);
    }
}
