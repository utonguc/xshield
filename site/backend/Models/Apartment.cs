namespace SitePlatform.Api.Models;

public class Apartment
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public int BlockId { get; set; }
    public Block Block { get; set; } = null!;
    public string Number { get; set; } = "";
    public int Floor { get; set; }
    public string? Type { get; set; }
    public decimal? SquareMeters { get; set; }
    public decimal? LandShare { get; set; }       // Arsa payı
    public decimal? MonthlyDues { get; set; }      // Daireye özel aylık aidat tutarı
    public ApartmentStatus Status { get; set; } = ApartmentStatus.Occupied;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? OwnerId { get; set; }
    public User? Owner { get; set; }
    public int? ResidentId { get; set; }
    public User? Resident { get; set; }

    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<Issue> Issues { get; set; } = [];
    public ICollection<DuesRecord> DuesRecords { get; set; } = [];
}

public enum ApartmentStatus
{
    Occupied = 0,
    Empty = 1,
    ForSale = 2,
    ForRent = 3
}
