namespace ClinicPlatform.Api.Models;

/// <summary>Weekly working hours per doctor.</summary>
public class DoctorSchedule
{
    public Guid   Id              { get; set; } = Guid.NewGuid();
    public Guid   DoctorId        { get; set; }
    public Guid   ClinicId        { get; set; }
    public int    DayOfWeek       { get; set; }  // 0=Sun … 6=Sat
    public TimeSpan StartTime     { get; set; }  // e.g. 09:00
    public TimeSpan EndTime       { get; set; }  // e.g. 17:00
    public int    SlotMinutes     { get; set; } = 30; // appointment slot duration
    public bool   IsActive        { get; set; } = true;

    public Doctor? Doctor  { get; set; }
    public Clinic? Clinic  { get; set; }
}

/// <summary>Doctor leave / vacation blocks.</summary>
public class DoctorLeave
{
    public Guid     Id          { get; set; } = Guid.NewGuid();
    public Guid     DoctorId    { get; set; }
    public Guid     ClinicId    { get; set; }
    public DateTime StartAtUtc  { get; set; }
    public DateTime EndAtUtc    { get; set; }
    public string?  Reason      { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Doctor? Doctor { get; set; }
    public Clinic? Clinic { get; set; }
}
