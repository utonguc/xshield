namespace ClinicPlatform.Api.Models;

public class ModuleLicense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic? Clinic { get; set; }

    public string ModuleCode { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class ModuleCodes
{
    public const string Crm          = "crm";
    public const string Appointments = "appointments";
    public const string Doctors      = "doctors";
    public const string Reports      = "reports";
    public const string Finance      = "finance";
    public const string Inventory    = "inventory";
    public const string Assets       = "assets";
    public const string Tasks        = "tasks";
    public const string Notifications = "notifications";
    public const string Documents    = "documents";
    public const string Surveys      = "surveys";
    public const string Whatsapp     = "whatsapp";

    public static readonly Dictionary<string, string> Labels = new()
    {
        [Crm]           = "CRM & Hasta Yönetimi",
        [Appointments]  = "Randevu Yönetimi",
        [Doctors]       = "Doktor Yönetimi",
        [Reports]       = "Raporlama",
        [Finance]       = "Finans & Faturalama",
        [Inventory]     = "Stok Yönetimi",
        [Assets]        = "Demirbaş Takibi",
        [Tasks]         = "Görev Yönetimi",
        [Notifications] = "Bildirim & SMS/Email",
        [Documents]     = "Belge Yönetimi",
        [Surveys]       = "Anket & Memnuniyet",
        [Whatsapp]      = "WhatsApp Entegrasyonu",
    };
}
