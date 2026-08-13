namespace SitePlatform.Api.Models;

public class User
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Resident;
    public bool IsActive { get; set; } = true;
    public long? TelegramChatId { get; set; }       // Bağlı Telegram sohbeti
    public string? TelegramLinkCode { get; set; }    // Tek kullanımlık eşleştirme kodu
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Apartment> OwnedApartments { get; set; } = [];
    public ICollection<Apartment> ResidentApartments { get; set; } = [];
    public ICollection<Issue> ReportedIssues { get; set; } = [];
}

public enum UserRole
{
    SiteAdmin = 0,
    Manager = 1,
    Resident = 2
}
