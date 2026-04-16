namespace ClinicPlatform.Api.Models;

/// <summary>
/// Patient-facing login account. Linked to a Patient record.
/// Patients register with their email and a password; they can then
/// log into the portal to view appointments, invoices, and documents.
/// </summary>
public class PatientAccount
{
    public Guid   Id           { get; set; } = Guid.NewGuid();
    public Guid   PatientId    { get; set; }
    public Patient? Patient    { get; set; }
    public Guid   ClinicId     { get; set; }

    public string Email        { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    public bool   IsActive     { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginUtc { get; set; }
}
