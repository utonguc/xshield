namespace ClinicPlatform.Api.Models;

public class Doctor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic? Clinic { get; set; }

    // ── Temel ────────────────────────────────────────────────────────────────
    public string FullName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;

    // ── Profil ────────────────────────────────────────────────────────────────
    public string? PhotoUrl { get; set; }
    public string? Biography { get; set; }
    public string? Specializations { get; set; }   // virgülle ayrılmış liste
    public int? ExperienceYears { get; set; }
    public string? Certificates { get; set; }      // virgülle ayrılmış liste

    // ── Meta ──────────────────────────────────────────────────────────────────
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
