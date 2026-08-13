namespace SitePlatform.Api.Models;

// Ziyaretçi defteri (güvenlikli siteler için giriş/çıkış kaydı)
public class Visitor
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string FullName { get; set; } = "";
    public string? Phone { get; set; }
    public int? ApartmentId { get; set; }          // Ziyaret edilen daire
    public Apartment? Apartment { get; set; }
    public string? PlateNumber { get; set; }        // Araç plakası
    public string? Note { get; set; }
    public DateTime EntryTime { get; set; } = DateTime.UtcNow;
    public DateTime? ExitTime { get; set; }          // null = hâlâ içeride
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
