namespace ClinicPlatform.Api.Models;

public class OrganizationSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ClinicId { get; set; }
    public Clinic? Clinic { get; set; }

    public string CompanyName { get; set; } = "Örnek Klinik";
    public string ApplicationTitle { get; set; } = "EstetixOS";
    public string? LogoUrl { get; set; }
    public string PrimaryColor { get; set; } = "#1d4ed8";
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
