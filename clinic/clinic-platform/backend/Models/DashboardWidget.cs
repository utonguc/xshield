namespace ClinicPlatform.Api.Models;

public class DashboardWidget
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string WidgetType { get; set; } = string.Empty;
    // kpi_patients | kpi_doctors | kpi_appointments | kpi_revenue
    // calendar_upcoming | list_latest_appointments | chart_doctor_load
    // list_leads | chart_lead_funnel | list_tasks | kpi_satisfaction

    public int SortOrder { get; set; } = 0;
    public string Size { get; set; } = "medium"; // small | medium | large | full
    public string? Config { get; set; }           // JSON — ek ayarlar
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class WidgetTypes
{
    public const string KpiPatients         = "kpi_patients";
    public const string KpiDoctors          = "kpi_doctors";
    public const string KpiAppointments     = "kpi_appointments";
    public const string KpiRevenue          = "kpi_revenue";
    public const string KpiSatisfaction     = "kpi_satisfaction";
    public const string KpiPendingRequests  = "kpi_pending_requests";
    public const string CalendarUpcoming    = "calendar_upcoming";
    public const string ListLatestAppts     = "list_latest_appointments";
    public const string ListPendingRequests = "list_pending_requests";
    public const string ChartDoctorLoad     = "chart_doctor_load";
    public const string ListLeads           = "list_leads";
    public const string ChartLeadFunnel     = "chart_lead_funnel";
    public const string ListTasks           = "list_tasks";
    public const string ChartMonthlyAppts   = "chart_monthly_appointments";

    public static readonly Dictionary<string, string> Labels = new()
    {
        [KpiPatients]          = "Toplam Hasta",
        [KpiDoctors]           = "Aktif Doktor",
        [KpiAppointments]      = "Toplam Randevu",
        [KpiRevenue]           = "Aylık Gelir",
        [KpiSatisfaction]      = "Hasta Memnuniyeti",
        [KpiPendingRequests]   = "Bekleyen İstekler",
        [CalendarUpcoming]     = "Yaklaşan Randevular",
        [ListLatestAppts]      = "Son Randevular",
        [ListPendingRequests]  = "Bekleyen Randevu İstekleri",
        [ChartDoctorLoad]      = "Doktor Yoğunluğu",
        [ListLeads]            = "Lead Listesi",
        [ChartLeadFunnel]      = "Lead Hunisi",
        [ListTasks]            = "Görevlerim",
        [ChartMonthlyAppts]    = "Aylık Randevu Grafiği",
    };

    // Rol başına varsayılan widget şablonları
    public static readonly Dictionary<string, string[]> RoleDefaults = new()
    {
        ["KlinikYonetici"] = [KpiPatients, KpiDoctors, KpiAppointments, KpiPendingRequests,
                               ChartDoctorLoad, ChartLeadFunnel, ListLatestAppts],
        ["Doktor"]         = [CalendarUpcoming, ListLatestAppts, KpiSatisfaction, KpiAppointments],
        ["Resepsiyon"]     = [KpiPendingRequests, ListPendingRequests, CalendarUpcoming, ListLeads],
        ["Asistan"]        = [CalendarUpcoming, ListLatestAppts, KpiPatients],
        ["Teknisyen"]      = [ListLatestAppts, KpiAppointments],
        ["SuperAdmin"]     = [KpiPatients, KpiDoctors, KpiAppointments, KpiRevenue, ChartMonthlyAppts],
    };
}
