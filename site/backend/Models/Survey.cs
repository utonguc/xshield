namespace SitePlatform.Api.Models;

// Sakin anketi (genel oylama/görüş)
public class Survey
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string Question { get; set; } = "";
    public string? Description { get; set; }
    public bool IsClosed { get; set; } = false;
    public DateTime? EndsAt { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SurveyOption> Options { get; set; } = [];
    public ICollection<SurveyVote> Votes { get; set; } = [];
}

public class SurveyOption
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public Survey Survey { get; set; } = null!;
    public string Text { get; set; } = "";
}

public class SurveyVote
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public Survey Survey { get; set; } = null!;
    public int OptionId { get; set; }
    public int UserId { get; set; }
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
}
