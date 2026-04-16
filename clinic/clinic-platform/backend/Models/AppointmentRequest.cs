namespace ClinicPlatform.Api.Models;

public static class AppointmentRequestStatuses
{
    public const string Pending  = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}

/// <summary>
/// Public-facing appointment request (no login required).
/// Receptionist reviews and approves → creates a real Appointment.
/// </summary>
public class AppointmentRequest
{
    public Guid     Id              { get; set; } = Guid.NewGuid();
    public Guid     ClinicId        { get; set; }
    public Guid     DoctorId        { get; set; }

    // Requested time slot
    public DateTime RequestedStartUtc { get; set; }
    public DateTime RequestedEndUtc   { get; set; }
    public string   ProcedureName   { get; set; } = string.Empty;

    // Patient info (anonymous, no account needed)
    public string   PatientFirstName { get; set; } = string.Empty;
    public string   PatientLastName  { get; set; } = string.Empty;
    public string?  PatientPhone     { get; set; }
    public string?  PatientEmail     { get; set; }
    public string?  PatientNotes     { get; set; }

    // Workflow
    public string   Status           { get; set; } = AppointmentRequestStatuses.Pending;
    public string?  RejectionReason  { get; set; }
    public Guid?    ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc   { get; set; }
    public Guid?    CreatedAppointmentId { get; set; }  // set after approval

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation
    public Clinic?  Clinic { get; set; }
    public Doctor?  Doctor { get; set; }
}
