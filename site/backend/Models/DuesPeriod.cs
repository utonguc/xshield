namespace SitePlatform.Api.Models;

// Bir aidat dönemi: "Ocak 2025 aidatı — 500 TL"
public class DuesPeriod
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string Title { get; set; } = "";
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DuesRecord> Records { get; set; } = [];
}

// Her dairenin o döneme ait aidat kaydı
public class DuesRecord
{
    public int Id { get; set; }
    public int DuesPeriodId { get; set; }
    public DuesPeriod DuesPeriod { get; set; } = null!;
    public int ApartmentId { get; set; }
    public Apartment Apartment { get; set; } = null!;
    public int SiteId { get; set; }
    public decimal Amount { get; set; }
    public DuesStatus Status { get; set; } = DuesStatus.Pending;
    public DateTime? PaidAt { get; set; }
    public string? Note { get; set; }

    public ICollection<Payment> Payments { get; set; } = [];
}

public enum DuesStatus
{
    Pending = 0,
    Paid = 1,
    Overdue = 2,
    PartiallyPaid = 3,
    Waived = 4
}
