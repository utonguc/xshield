namespace SitePlatform.Api.Models;

public class Message
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public int FromUserId { get; set; }
    public User FromUser { get; set; } = null!;
    public int ToUserId { get; set; }
    public User ToUser { get; set; } = null!;
    public string Content { get; set; } = "";
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
