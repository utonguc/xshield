namespace SitePlatform.Api.Models;

public class Meeting
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? Agenda { get; set; }
    public DateTime MeetingDate { get; set; }
    public string? Location { get; set; }
    public MeetingStatus Status { get; set; } = MeetingStatus.Scheduled;
    public string? Minutes { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum MeetingStatus
{
    Scheduled = 0,
    Completed = 1,
    Cancelled = 2,
    Postponed = 3
}
