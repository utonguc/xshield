namespace SitePlatform.Api.Models;

// Ek ödeme kampanyası (aidata paralel, tek seferlik toplama)
public class ExtraCollection
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string Title { get; set; } = "";          // Örn: "Bahçe Duvarı Tadilatı"
    public string? Description { get; set; }
    public decimal Amount { get; set; }               // Daire başı varsayılan tutar
    public DateOnly? DueDate { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ExtraCollectionRecord> Records { get; set; } = [];
}

// Kampanyaya dahil edilen her daire için kayıt
public class ExtraCollectionRecord
{
    public int Id { get; set; }
    public int ExtraCollectionId { get; set; }
    public ExtraCollection ExtraCollection { get; set; } = null!;
    public int ApartmentId { get; set; }
    public Apartment Apartment { get; set; } = null!;
    public int SiteId { get; set; }
    public decimal Amount { get; set; }
    public DuesStatus Status { get; set; } = DuesStatus.Pending;
    public DateTime? PaidAt { get; set; }
    public string? Note { get; set; }
}
