using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Services;

/// <summary>
/// Runs every 30 minutes.
/// Sends WhatsApp + email reminders to patients whose appointment is in the next 23–25 hour window.
/// Uses WhatsAppLogs as a deduplication check (avoids sending duplicate reminders).
/// </summary>
public class AppointmentReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AppointmentReminderWorker> _log;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);

    public AppointmentReminderWorker(IServiceScopeFactory scopeFactory, ILogger<AppointmentReminderWorker> log)
    {
        _scopeFactory = scopeFactory;
        _log          = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("AppointmentReminderWorker started.");
        await Task.Delay(TimeSpan.FromSeconds(60), ct).ConfigureAwait(false);

        while (!ct.IsCancellationRequested)
        {
            try   { await SendRemindersAsync(ct); }
            catch (Exception ex) { _log.LogError(ex, "AppointmentReminderWorker error."); }
            await Task.Delay(Interval, ct).ConfigureAwait(false);
        }
    }

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope  = _scopeFactory.CreateScope();
        var db           = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var wa           = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now        = DateTime.UtcNow;
        var window24h  = now.AddHours(23);
        var window25h  = now.AddHours(25);

        // Find appointments in the 23–25h window that are Scheduled
        var upcoming = await db.Appointments
            .Include(x => x.Patient)
            .Include(x => x.Doctor)
            .Where(x => x.Status == "Scheduled"
                     && x.StartAtUtc >= window24h
                     && x.StartAtUtc <= window25h)
            .ToListAsync(ct);

        if (upcoming.Count == 0) return;

        // Check which ones already have a reminder log
        var apptIds = upcoming.Select(x => x.Id).ToList();
        var alreadySent = await db.WhatsAppLogs
            .Where(x => x.AppointmentId != null && apptIds.Contains(x.AppointmentId.Value)
                     && x.MessageType == "reminder_24h")
            .Select(x => x.AppointmentId!.Value)
            .ToListAsync(ct);

        var toRemind = upcoming.Where(x => !alreadySent.Contains(x.Id)).ToList();

        _log.LogInformation("AppointmentReminderWorker: {Count} reminders to send.", toRemind.Count);

        foreach (var appt in toRemind)
        {
            var patient = appt.Patient;
            var doctor  = appt.Doctor;
            if (patient is null) continue;

            var patientName = $"{patient.FirstName} {patient.LastName}".Trim();
            var doctorName  = doctor?.FullName ?? "Doktorunuz";
            var apptTime    = appt.StartAtUtc.ToString("dd.MM.yyyy HH:mm");

            // Send WhatsApp if phone available
            if (!string.IsNullOrWhiteSpace(patient.Phone))
            {
                var msg = WhatsAppTemplates.AppointmentReminder(patientName, doctorName, apptTime);
                await wa.SendTextAsync(appt.ClinicId, patient.Phone, msg, patient.Id, "system",
                    appointmentId: appt.Id, messageType: "reminder_24h");
            }

            // Send email if email available and no phone
            if (!string.IsNullOrWhiteSpace(patient.Email))
            {
                var html = $"""
                    <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
                      <h2 style="color:#1d4ed8">Randevu Hatırlatması</h2>
                      <p>Merhaba <strong>{patientName}</strong>,</p>
                      <p>Yarınki randevunuzu hatırlatmak istedik.</p>
                      <table style="width:100%;border-collapse:collapse;margin:16px 0">
                        <tr><td style="padding:8px;color:#64748b;width:40%">Doktor</td><td style="padding:8px;font-weight:700">{doctorName}</td></tr>
                        <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Tarih &amp; Saat</td><td style="padding:8px;font-weight:700">{apptTime}</td></tr>
                        <tr><td style="padding:8px;color:#64748b">İşlem</td><td style="padding:8px">{appt.ProcedureName}</td></tr>
                      </table>
                      <p style="color:#64748b;font-size:13px">Randevunuzu iptal etmeniz gerekirse lütfen kliniğimizle iletişime geçin.</p>
                    </div>
                    """;
                await emailService.SendAsync(patient.Email, "Yarınki Randevunuz — Hatırlatma", html);
            }

            await Task.Delay(200, ct); // rate limit protection
        }
    }
}
