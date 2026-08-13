namespace SitePlatform.Api.Models;

public class Announcement
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public bool IsPinned { get; set; } = false;
    public AnnouncementCategory Category { get; set; } = AnnouncementCategory.General;
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
}

public enum AnnouncementCategory
{
    General = 0,
    Maintenance = 1,
    Meeting = 2,
    Security = 3,
    Financial = 4,
    Emergency = 5
}
