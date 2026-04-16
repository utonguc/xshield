namespace ClinicPlatform.Api.Models;

public class Asset
{
    public Guid   Id       { get; set; } = Guid.NewGuid();
    public Guid   ClinicId { get; set; }
    public Clinic? Clinic  { get; set; }

    public string  Name         { get; set; } = string.Empty;
    public string? Category     { get; set; }
    public string? Brand        { get; set; }
    public string? Model        { get; set; }
    public string? SerialNo     { get; set; }
    public string  Status       { get; set; } = AssetStatuses.Active;
    public string? Location     { get; set; }

    public decimal? PurchasePrice { get; set; }
    public DateTime? PurchasedAt  { get; set; }
    public DateTime? WarrantyUntil { get; set; }
    public DateTime? NextMaintenanceAt { get; set; }

    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class AssetStatuses
{
    public const string Active      = "Active";
    public const string Maintenance = "Maintenance";
    public const string Broken      = "Broken";
    public const string Retired     = "Retired";
    public static readonly string[] All = [Active, Maintenance, Broken, Retired];
}
