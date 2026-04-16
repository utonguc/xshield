namespace ClinicPlatform.Api.Models;

public class Patient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic? Clinic { get; set; }

    // ── Temel bilgiler ────────────────────────────────────────────────────────
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }

    // ── CRM / Lead alanları ───────────────────────────────────────────────────
    public string? InterestedProcedure { get; set; }
    public string? LeadSource { get; set; }
    public string? AssignedConsultant { get; set; }
    public string LeadStatus { get; set; } = LeadStatuses.New;

    // ── Notlar & meta ─────────────────────────────────────────────────────────
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

public static class LeadStatuses
{
    public const string New       = "Yeni";
    public const string Contacted = "Görüşüldü";
    public const string Offered   = "Teklif Verildi";
    public const string Scheduled = "Randevu Oluştu";
    public const string Treated   = "İşlem Yapıldı";
    public const string Cancelled = "İptal";

    public static readonly string[] All =
        [New, Contacted, Offered, Scheduled, Treated, Cancelled];
}
