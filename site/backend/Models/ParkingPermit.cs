namespace SitePlatform.Api.Models;

// Otopark giriş izni olan plakalar
public class ParkingPermit
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public Site Site { get; set; } = null!;
    public string PlateNumber { get; set; } = "";       // Görünen hali (34 ABC 123)
    public string PlateNormalized { get; set; } = "";    // Eşleştirme için (34ABC123)
    public string? OwnerName { get; set; }                // Araç sahibi/sürücü
    public int? ApartmentId { get; set; }
    public Apartment? Apartment { get; set; }
    public string? VehicleInfo { get; set; }              // Marka/model/renk
    public PermitType PermitType { get; set; } = PermitType.Resident;
    public DateOnly? ValidUntil { get; set; }             // Geçici izinler için son geçerlilik
    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public static string Normalize(string plate) =>
        new string((plate ?? "").Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
}

public enum PermitType
{
    Resident = 0,    // Sakin aracı
    Guest = 1,       // Düzenli misafir
    Temporary = 2,   // Geçici izin
    Other = 3        // Diğer (personel, tedarikçi vb.)
}
