namespace ClinicPlatform.Api.Models;

public class Notification
{
    public Guid   Id       { get; set; } = Guid.NewGuid();
    public Guid   ClinicId { get; set; }
    public Clinic? Clinic  { get; set; }

    public Guid  UserId { get; set; }   // alıcı
    public User? User   { get; set; }

    public string  Title   { get; set; } = string.Empty;
    public string  Message { get; set; } = string.Empty;
    public string  Type    { get; set; } = NotificationTypes.Info;  // info/success/warning/error
    public string? Link    { get; set; }  // isteğe bağlı: /patients, /appointments vb.

    public bool     IsRead      { get; set; } = false;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string?  DedupeKey   { get; set; }  // used by ClinicAlertWorker to prevent duplicate alerts
}

public static class NotificationTypes
{
    public const string Info    = "info";
    public const string Success = "success";
    public const string Warning = "warning";
    public const string Error   = "error";
}
