namespace ClinicPlatform.Api.Models;

public class ScheduledReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid CreatedByUserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    // summary | doctor_performance | lead_funnel | appointment_stats | monthly_overview

    public string Frequency { get; set; } = ReportFrequency.Weekly;
    // daily | weekly | monthly

    public string? RecipientEmails { get; set; }  // virgülle ayrılmış
    public bool IsActive { get; set; } = true;
    public DateTime? LastSentAtUtc { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class ReportFrequency
{
    public const string Daily   = "daily";
    public const string Weekly  = "weekly";
    public const string Monthly = "monthly";
}

public static class ReportTypes
{
    public const string Summary            = "summary";
    public const string DoctorPerformance  = "doctor_performance";
    public const string LeadFunnel         = "lead_funnel";
    public const string AppointmentStats   = "appointment_stats";
    public const string MonthlyOverview    = "monthly_overview";

    public static readonly Dictionary<string, string> Labels = new()
    {
        [Summary]           = "Genel Özet",
        [DoctorPerformance] = "Doktor Performansı",
        [LeadFunnel]        = "Lead Hunisi",
        [AppointmentStats]  = "Randevu İstatistikleri",
        [MonthlyOverview]   = "Aylık Genel Bakış",
    };
}
