// Models/Appointment.cs
namespace ClinicPlatform.Api.Models;

public class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic? Clinic { get; set; }
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public Guid DoctorId { get; set; }
    public Doctor? Doctor { get; set; }
    public string ProcedureName { get; set; } = string.Empty;
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public string? Notes { get; set; }
    // Scheduled | Completed | Cancelled | NoShow
    public string Status { get; set; } = "Scheduled";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
