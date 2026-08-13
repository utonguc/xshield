namespace SitePlatform.Api.Models;

// Yönetici değişikliği oylaması
public class AdminVote
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public int NomineeId { get; set; }         // Aday yönetici
    public User Nominee { get; set; } = null!;
    public int StartedById { get; set; }        // Oylamayı başlatan
    public User StartedBy { get; set; } = null!;
    public string Reason { get; set; } = "";    // Gerekçe
    public VoteStatus Status { get; set; } = VoteStatus.Active;
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime EndsAt { get; set; }        // Oylama bitiş tarihi
    public int QuorumPercent { get; set; } = 51; // Kaç % oy gerekli
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AdminVoteChoice> Choices { get; set; } = [];
}

public class AdminVoteChoice
{
    public int Id { get; set; }
    public int AdminVoteId { get; set; }
    public AdminVote AdminVote { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public bool InFavor { get; set; }           // true=Evet, false=Hayır
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
}

public enum VoteStatus
{
    Active = 0,
    Passed = 1,    // Oy çokluğu sağlandı, devir gerçekleşti
    Failed = 2,    // Yeterli oy sağlanamadı
    Cancelled = 3  // İptal edildi
}
