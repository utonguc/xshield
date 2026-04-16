namespace ClinicPlatform.Api.Models;

/// <summary>
/// Per-clinic WhatsApp Cloud API configuration.
/// </summary>
public class WhatsAppSetting
{
    public Guid    Id              { get; set; } = Guid.NewGuid();
    public Guid    ClinicId        { get; set; }
    public string? ApiToken        { get; set; }   // Meta permanent access token
    public string? PhoneNumberId   { get; set; }   // WhatsApp Business phone number ID
    public string? FromNumber      { get; set; }   // Display number e.g. +905551234567
    public bool    IsActive        { get; set; } = false;
    public DateTime UpdatedAtUtc   { get; set; } = DateTime.UtcNow;

    public Clinic? Clinic { get; set; }
}

/// <summary>
/// Outbound message log.
/// </summary>
public class WhatsAppLog
{
    public Guid     Id          { get; set; } = Guid.NewGuid();
    public Guid     ClinicId    { get; set; }
    public string   ToNumber    { get; set; } = string.Empty;
    public string   MessageBody { get; set; } = string.Empty;
    public string   Status      { get; set; } = "pending"; // pending | sent | failed
    public string?  ErrorDetail { get; set; }
    public Guid?    PatientId     { get; set; }
    public Guid?    AppointmentId { get; set; }  // for reminder deduplication
    public string?  MessageType   { get; set; }  // "custom" | "reminder_24h" | "campaign" etc.
    public string?  SentByName    { get; set; }
    public DateTime CreatedAtUtc  { get; set; } = DateTime.UtcNow;

    public Patient? Patient { get; set; }
}

public static class WhatsAppTemplates
{
    /// <summary>Appointment reminder — uses free-form text (within 24h window) or template.</summary>
    public static string AppointmentReminder(string patientName, string doctorName, string dateTime)
        => $"Merhaba {patientName}, {dateTime} tarihinde {doctorName} ile randevunuz bulunmaktadır. İyi günler dileriz. — xShield e-Clinic";

    public static string SurveyInvite(string patientName, string surveyUrl)
        => $"Merhaba {patientName}, kliniğimizdeki deneyiminizi değerlendirmeniz için kısa bir anket hazırladık: {surveyUrl} Teşekkürler! — xShield e-Clinic";

    public static string CustomMessage(string body) => body;
}
