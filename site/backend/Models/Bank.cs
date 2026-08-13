namespace SitePlatform.Api.Models;

public class Bank
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string BankName { get; set; } = "";
    public string AccountName { get; set; } = "";
    public string Iban { get; set; } = "";
    public string? Branch { get; set; }
    public string? AccountNo { get; set; }
    public bool IsDefault { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
