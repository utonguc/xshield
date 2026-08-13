namespace SitePlatform.Api.Models;

public class Issue
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public int? ApartmentId { get; set; }
    public Apartment? Apartment { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public IssueStatus Status { get; set; } = IssueStatus.Open;
    public IssuePriority Priority { get; set; } = IssuePriority.Medium;
    public IssueCategory Category { get; set; } = IssueCategory.Other;
    public int CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public int? AssignedToId { get; set; }
    public User? AssignedTo { get; set; }
    public string? Resolution { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum IssueStatus
{
    Open = 0,
    InProgress = 1,
    Resolved = 2,
    Closed = 3
}

public enum IssuePriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public enum IssueCategory
{
    Electrical = 0,
    Plumbing = 1,
    Elevator = 2,
    Common = 3,
    Security = 4,
    Cleaning = 5,
    Other = 6
}
