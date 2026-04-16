namespace ClinicPlatform.Api.Models;

public class Invoice
{
    public Guid   Id        { get; set; } = Guid.NewGuid();
    public Guid   ClinicId  { get; set; }
    public Clinic? Clinic   { get; set; }

    public Guid    PatientId { get; set; }
    public Patient? Patient  { get; set; }

    public Guid?  DoctorId  { get; set; }
    public Doctor? Doctor   { get; set; }

    public string InvoiceNo   { get; set; } = string.Empty;  // KLN-2026-0001
    public DateTime IssuedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? DueAtUtc  { get; set; }

    public string  Status   { get; set; } = InvoiceStatuses.Draft;
    public string  Currency { get; set; } = "TRY";

    public decimal Subtotal  { get; set; }
    public decimal TaxRate   { get; set; }   // 0 / 10 / 20
    public decimal TaxAmount { get; set; }
    public decimal Total     { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}

public class InvoiceItem
{
    public Guid    Id          { get; set; } = Guid.NewGuid();
    public Guid    InvoiceId   { get; set; }
    public Invoice? Invoice    { get; set; }

    public string  Description { get; set; } = string.Empty;
    public int     Quantity    { get; set; } = 1;
    public decimal UnitPrice   { get; set; }
    public decimal LineTotal   { get; set; }  // Quantity * UnitPrice
}

public static class InvoiceStatuses
{
    public const string Draft     = "Draft";
    public const string Sent      = "Sent";
    public const string Paid      = "Paid";
    public const string Overdue   = "Overdue";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All = [Draft, Sent, Paid, Overdue, Cancelled];
}
