namespace ClinicPlatform.Api.Models;

public class StockItem
{
    public Guid   Id        { get; set; } = Guid.NewGuid();
    public Guid   ClinicId  { get; set; }
    public Clinic? Clinic   { get; set; }

    public string  Name        { get; set; } = string.Empty;
    public string? Category    { get; set; }
    public string? Unit        { get; set; }   // adet, kutu, ml, gr…
    public string? Barcode     { get; set; }
    public string? Supplier    { get; set; }
    public decimal UnitCost    { get; set; }

    public int  Quantity    { get; set; } = 0;
    public int  MinQuantity { get; set; } = 5;   // kritik stok eşiği

    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime  CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime  UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<StockMovement> Movements { get; set; } = new List<StockMovement>();
}

public class StockMovement
{
    public Guid      Id          { get; set; } = Guid.NewGuid();
    public Guid      StockItemId { get; set; }
    public StockItem? StockItem  { get; set; }

    public string  Type      { get; set; } = StockMovementTypes.In;  // in / out / adjust
    public int     Quantity  { get; set; }
    public string? Note      { get; set; }

    public Guid?  UserId    { get; set; }
    public User?  User      { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class StockMovementTypes
{
    public const string In     = "in";
    public const string Out    = "out";
    public const string Adjust = "adjust";
}
