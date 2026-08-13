namespace SitePlatform.Api.Models;

public class Block
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string Name { get; set; } = "";
    public int FloorCount { get; set; }
    public decimal DuesCoefficient { get; set; } = 0;   // Aidat çarpanı (örn. bloklar 128, villalar 113)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Apartment> Apartments { get; set; } = [];
}
