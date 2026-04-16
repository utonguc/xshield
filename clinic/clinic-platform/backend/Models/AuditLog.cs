namespace ClinicPlatform.Api.Models;

public class AuditLog
{
    public Guid   Id        { get; set; } = Guid.NewGuid();
    public Guid   ClinicId  { get; set; }

    /// <summary>Who performed the action (null = system/anonymous)</summary>
    public Guid?  UserId    { get; set; }
    public User?  User      { get; set; }

    /// <summary>e.g. "Patient", "Invoice", "Appointment", "Doctor"</summary>
    public string EntityType   { get; set; } = string.Empty;

    /// <summary>GUID string of the affected record</summary>
    public string EntityId     { get; set; } = string.Empty;

    /// <summary>e.g. "Created", "Updated", "Deleted", "StatusChanged", "Login"</summary>
    public string Action       { get; set; } = string.Empty;

    /// <summary>Human-readable summary</summary>
    public string Description  { get; set; } = string.Empty;

    /// <summary>JSON snapshot of changed fields: { "field": ["old","new"] }</summary>
    public string? ChangesJson { get; set; }

    /// <summary>Client IP address</summary>
    public string? IpAddress   { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class AuditActions
{
    public const string Created       = "Created";
    public const string Updated       = "Updated";
    public const string Deleted       = "Deleted";
    public const string StatusChanged = "StatusChanged";
    public const string Login         = "Login";
    public const string PasswordChanged = "PasswordChanged";
    public const string Published     = "Published";
    public const string Approved      = "Approved";
    public const string Rejected      = "Rejected";
}
