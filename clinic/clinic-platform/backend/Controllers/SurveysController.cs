using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.DTOs;
using ClinicPlatform.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SurveysController : ControllerBase
{
    private readonly AppDbContext _db;
    public SurveysController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId);
    }

    private static SurveyListItemResponse ToListItem(Survey s, List<SurveyResponse> responses)
    {
        var ratingAnswers = responses
            .SelectMany(r => r.Answers)
            .Where(a => a.Question?.Type == SurveyQuestionTypes.Rating && int.TryParse(a.Value, out _))
            .Select(a => int.Parse(a.Value!))
            .ToList();

        double? avg = ratingAnswers.Count > 0 ? Math.Round(ratingAnswers.Average(), 2) : null;

        return new SurveyListItemResponse
        {
            Id            = s.Id,
            Title         = s.Title,
            Description   = s.Description,
            Status        = s.Status,
            QuestionCount = s.Questions.Count,
            ResponseCount = responses.Count,
            AvgRating     = avg,
            CreatedAtUtc  = s.CreatedAtUtc,
        };
    }

    // GET api/surveys
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var surveys = await _db.Surveys
            .Where(x => x.ClinicId == clinicId)
            .Include(x => x.Questions)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        var surveyIds = surveys.Select(s => s.Id).ToList();
        var responses = await _db.SurveyResponses
            .Where(r => surveyIds.Contains(r.SurveyId))
            .Include(r => r.Answers).ThenInclude(a => a.Question)
            .ToListAsync();

        var result = surveys.Select(s => ToListItem(s, responses.Where(r => r.SurveyId == s.Id).ToList()));
        return Ok(result);
    }

    // GET api/surveys/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var survey = await _db.Surveys
            .Include(x => x.Questions.OrderBy(q => q.SortOrder))
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (survey is null) return NotFound();

        var responses = await _db.SurveyResponses
            .Where(r => r.SurveyId == id)
            .Include(r => r.Answers).ThenInclude(a => a.Question)
            .ToListAsync();

        var listItem = ToListItem(survey, responses);
        return Ok(new SurveyDetailResponse
        {
            Id            = listItem.Id,
            Title         = listItem.Title,
            Description   = listItem.Description,
            Status        = listItem.Status,
            QuestionCount = listItem.QuestionCount,
            ResponseCount = listItem.ResponseCount,
            AvgRating     = listItem.AvgRating,
            CreatedAtUtc  = listItem.CreatedAtUtc,
            Questions     = survey.Questions.Select(q => new SurveyQuestionResponse
            {
                Id         = q.Id,
                SortOrder  = q.SortOrder,
                Text       = q.Text,
                Type       = q.Type,
                Options    = q.Options,
                IsRequired = q.IsRequired,
            }).ToList(),
        });
    }

    // GET api/surveys/{id}/responses
    [HttpGet("{id:guid}/responses")]
    public async Task<IActionResult> GetResponses(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var survey = await _db.Surveys
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (survey is null) return NotFound();

        var responses = await _db.SurveyResponses
            .Where(r => r.SurveyId == id)
            .Include(r => r.Answers).ThenInclude(a => a.Question)
            .OrderByDescending(r => r.SubmittedAtUtc)
            .ToListAsync();

        var result = responses.Select(r =>
        {
            var ratingVals = r.Answers
                .Where(a => a.Question?.Type == SurveyQuestionTypes.Rating && int.TryParse(a.Value, out _))
                .Select(a => (double)int.Parse(a.Value!))
                .ToList();
            double? ratingAvg = ratingVals.Count > 0 ? Math.Round(ratingVals.Average(), 2) : null;

            return new SurveyResponseListItem
            {
                Id             = r.Id,
                PatientName    = r.PatientName,
                Email          = r.Email,
                RatingAvg      = ratingAvg,
                SubmittedAtUtc = r.SubmittedAtUtc,
                Answers        = r.Answers.Select(a => new SurveyAnswerItem
                {
                    QuestionText = a.Question?.Text ?? "",
                    QuestionType = a.Question?.Type ?? "",
                    Value        = a.Value,
                }).ToList(),
            };
        });

        return Ok(result);
    }

    // GET api/surveys/{id}/stats
    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetStats(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var survey = await _db.Surveys
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (survey is null) return NotFound();

        var responses = await _db.SurveyResponses
            .Where(r => r.SurveyId == id)
            .Include(r => r.Answers)
            .ToListAsync();

        var allAnswers = responses.SelectMany(r => r.Answers).ToList();
        var ratingAnswers = allAnswers
            .Where(a => survey.Questions.FirstOrDefault(q => q.Id == a.QuestionId)?.Type == SurveyQuestionTypes.Rating
                        && int.TryParse(a.Value, out _))
            .Select(a => int.Parse(a.Value!))
            .ToList();

        double? avgRating = ratingAnswers.Count > 0 ? Math.Round(ratingAnswers.Average(), 2) : null;

        var questionStats = survey.Questions.Select(q =>
        {
            var qAnswers = allAnswers.Where(a => a.QuestionId == q.Id).ToList();
            var valueCounts = qAnswers
                .Where(a => a.Value != null)
                .GroupBy(a => a.Value!)
                .ToDictionary(g => g.Key, g => g.Count());

            double? qAvg = null;
            if (q.Type == SurveyQuestionTypes.Rating)
            {
                var nums = qAnswers.Where(a => int.TryParse(a.Value, out _)).Select(a => (double)int.Parse(a.Value!)).ToList();
                if (nums.Count > 0) qAvg = Math.Round(nums.Average(), 2);
            }

            return new QuestionStatItem
            {
                QuestionId   = q.Id,
                QuestionText = q.Text,
                QuestionType = q.Type,
                AvgValue     = qAvg,
                ValueCounts  = valueCounts,
            };
        }).ToList();

        return Ok(new SurveyStatsResponse
        {
            TotalResponses = responses.Count,
            AvgRating      = avgRating,
            Positive       = ratingAnswers.Count(r => r >= 4),
            Neutral        = ratingAnswers.Count(r => r == 3),
            Negative       = ratingAnswers.Count(r => r <= 2),
            QuestionStats  = questionStats,
        });
    }

    // POST api/surveys
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSurveyRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { message = "Anket başlığı zorunlu." });

        var survey = new Survey
        {
            ClinicId    = clinicId,
            Title       = req.Title.Trim(),
            Description = req.Description?.Trim(),
            Questions   = req.Questions.Select((q, i) => new SurveyQuestion
            {
                SortOrder  = q.SortOrder > 0 ? q.SortOrder : i + 1,
                Text       = q.Text.Trim(),
                Type       = SurveyQuestionTypes.All.Contains(q.Type) ? q.Type : SurveyQuestionTypes.Rating,
                Options    = q.Options?.Trim(),
                IsRequired = q.IsRequired,
            }).ToList(),
        };
        _db.Surveys.Add(survey);
        await _db.SaveChangesAsync();
        return Ok(new { id = survey.Id });
    }

    // PUT api/surveys/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSurveyRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var survey = await _db.Surveys
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (survey is null) return NotFound();

        survey.Title         = req.Title.Trim();
        survey.Description   = req.Description?.Trim();
        survey.Status        = SurveyStatuses.Active == req.Status || req.Status == SurveyStatuses.Inactive ? req.Status : survey.Status;
        survey.UpdatedAtUtc  = DateTime.UtcNow;

        // Replace questions
        _db.SurveyQuestions.RemoveRange(survey.Questions);
        survey.Questions = req.Questions.Select((q, i) => new SurveyQuestion
        {
            SurveyId   = id,
            SortOrder  = q.SortOrder > 0 ? q.SortOrder : i + 1,
            Text       = q.Text.Trim(),
            Type       = SurveyQuestionTypes.All.Contains(q.Type) ? q.Type : SurveyQuestionTypes.Rating,
            Options    = q.Options?.Trim(),
            IsRequired = q.IsRequired,
        }).ToList();

        await _db.SaveChangesAsync();
        return Ok(new { message = "Güncellendi." });
    }

    // PATCH api/surveys/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] UpdateSurveyStatusRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var survey = await _db.Surveys.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (survey is null) return NotFound();

        survey.Status        = req.Status;
        survey.UpdatedAtUtc  = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Durum güncellendi." });
    }

    // POST api/surveys/{id}/respond  (public – no token needed for patient-facing)
    [HttpPost("{id:guid}/respond")]
    [AllowAnonymous]
    public async Task<IActionResult> Submit(Guid id, [FromBody] SubmitSurveyRequest req)
    {
        var survey = await _db.Surveys
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == SurveyStatuses.Active);
        if (survey is null) return NotFound(new { message = "Anket bulunamadı veya aktif değil." });

        var patientName = req.PatientName;
        if (req.PatientId.HasValue)
        {
            var patient = await _db.Patients.FirstOrDefaultAsync(x => x.Id == req.PatientId.Value);
            if (patient != null) patientName = $"{patient.FirstName} {patient.LastName}".Trim();
        }

        var response = new SurveyResponse
        {
            SurveyId      = id,
            PatientId     = req.PatientId,
            PatientName   = patientName,
            Email         = req.Email,
            Answers       = req.Answers.Select(a => new SurveyAnswer
            {
                QuestionId = a.QuestionId,
                Value      = a.Value,
            }).ToList(),
        };
        _db.SurveyResponses.Add(response);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Yanıtınız kaydedildi. Teşekkürler!" });
    }

    // DELETE api/surveys/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var survey = await _db.Surveys.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (survey is null) return NotFound();
        _db.Surveys.Remove(survey);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }

    // DELETE api/surveys/{id}/responses/{responseId}
    [HttpDelete("{id:guid}/responses/{responseId:guid}")]
    public async Task<IActionResult> DeleteResponse(Guid id, Guid responseId)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var survey = await _db.Surveys.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (survey is null) return NotFound();

        var response = await _db.SurveyResponses.FirstOrDefaultAsync(x => x.SurveyId == id && x.Id == responseId);
        if (response is null) return NotFound();
        _db.SurveyResponses.Remove(response);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}

// small DTO used only here
public class UpdateSurveyStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
