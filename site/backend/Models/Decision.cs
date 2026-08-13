namespace SitePlatform.Api.Models;

// Karar Defteri (KMK gereği yönetim kararlarının resmi kaydı)
public class Decision
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public int Number { get; set; }                  // Site içinde sıra no (1, 2, 3...)
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public DateOnly DecisionDate { get; set; }
    public DecisionResult Result { get; set; } = DecisionResult.Accepted;
    public int? MeetingId { get; set; }              // İlişkili toplantı (opsiyonel)
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum DecisionResult
{
    Accepted = 0,    // Kabul edildi
    Rejected = 1,    // Reddedildi
    Postponed = 2    // Ertelendi
}
