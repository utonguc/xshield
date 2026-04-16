namespace ClinicPlatform.Api.Models;

/// <summary>Public website configuration for a clinic.</summary>
public class ClinicWebsite
{
    public Guid    Id            { get; set; } = Guid.NewGuid();
    public Guid    ClinicId      { get; set; }
    public string  Slug          { get; set; } = string.Empty;  // e.g. "demo-klinik"
    public string? CustomDomain  { get; set; }  // e.g. "www.klinikadi.com"
    public bool    IsPublished   { get; set; } = false;

    // Branding
    public string? HeroTitle     { get; set; }
    public string? HeroSubtitle  { get; set; }
    public string? HeroImageUrl  { get; set; }
    public string? AboutText     { get; set; }
    public string? Address       { get; set; }
    public string? Phone         { get; set; }
    public string? Email         { get; set; }
    public string? GoogleMapsUrl { get; set; }
    public string? InstagramUrl  { get; set; }
    public string? FacebookUrl   { get; set; }
    public string? WhatsAppNumber { get; set; }

    // Theme
    public string  PrimaryColor  { get; set; } = "#1d4ed8";
    public string  Theme         { get; set; } = "modern"; // modern | minimal | elegant

    // SEO
    public string? MetaTitle       { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords    { get; set; }

    // Features
    public bool   ShowPrices      { get; set; } = false;
    public bool   ShowReviews     { get; set; } = true;
    public bool   BookingEnabled  { get; set; } = true;

    /// <summary>Kliniğin /klinikler dizininde listelenmesine izin verir. Varsayılan: kapalı.</summary>
    public bool   ListedInDirectory { get; set; } = false;

    public DateTime UpdatedAtUtc  { get; set; } = DateTime.UtcNow;

    public Clinic? Clinic { get; set; }
}
