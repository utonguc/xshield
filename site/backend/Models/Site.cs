namespace SitePlatform.Api.Models;

public class Site
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? LogoUrl { get; set; }
    public string? TaxNumber { get; set; }
    public SubscriptionTier Tier { get; set; } = SubscriptionTier.Free;
    public decimal DuesBaseAmount { get; set; } = 0;   // Aidat sabit tabanı (örn. 4.400)
    public string? TelegramGroupChatId { get; set; }   // Site Telegram grubu (opsiyonel yayın hedefi)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Block> Blocks { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Announcement> Announcements { get; set; } = [];
    public ICollection<Meeting> Meetings { get; set; } = [];
    public ICollection<Issue> Issues { get; set; } = [];
    public ICollection<Bank> Banks { get; set; } = [];
    public ICollection<DuesPeriod> DuesPeriods { get; set; } = [];
}

public enum SubscriptionTier
{
    Free = 0,
    Starter = 1,
    Professional = 2,
    Enterprise = 3
}
