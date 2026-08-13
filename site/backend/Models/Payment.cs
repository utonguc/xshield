namespace SitePlatform.Api.Models;

public class Payment
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public int ApartmentId { get; set; }
    public Apartment Apartment { get; set; } = null!;
    public int? DuesRecordId { get; set; }
    public DuesRecord? DuesRecord { get; set; }
    public int? ExtraCollectionRecordId { get; set; }   // Ek ödeme kaynaklı ise
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public PaymentMethod Method { get; set; } = PaymentMethod.BankTransfer;
    public string? ReceiptNo { get; set; }
    public string? Note { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum PaymentMethod
{
    BankTransfer = 0,
    Cash = 1,
    CreditCard = 2,
    EFT = 3
}
