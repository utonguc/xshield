using ClinicPlatform.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Services;

/// <summary>
/// Background worker: her 5 dakikada bir zamanlanmış raporları kontrol eder
/// ve zamanı gelen raporları email ile gönderir.
/// </summary>
public class ReportEmailWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReportEmailWorker> _log;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    public ReportEmailWorker(IServiceScopeFactory scopeFactory, ILogger<ReportEmailWorker> log)
    {
        _scopeFactory = scopeFactory;
        _log          = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("ReportEmailWorker started.");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ProcessDueReportsAsync(ct);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "ReportEmailWorker error.");
            }

            await Task.Delay(Interval, ct).ConfigureAwait(false);
        }
    }

    private async Task ProcessDueReportsAsync(CancellationToken ct)
    {
        using var scope  = _scopeFactory.CreateScope();
        var db           = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var now          = DateTime.UtcNow;

        var due = await db.ScheduledReports
            .Where(r => r.IsActive && r.NextRunAtUtc <= now)
            .ToListAsync(ct);

        if (due.Count == 0) return;

        _log.LogInformation("Found {Count} due scheduled report(s).", due.Count);

        foreach (var report in due)
        {
            try
            {
                var (subject, html) = await ReportBuilder.BuildAsync(db, report.ClinicId, report.ReportType, report.Name);

                var emails = (report.RecipientEmails ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

                await emailService.SendAsync(emails, subject, html);

                report.LastSentAtUtc = now;
                report.NextRunAtUtc  = report.Frequency switch
                {
                    "daily"   => now.AddDays(1).Date.ToUniversalTime(),
                    "weekly"  => now.AddDays(7).Date.ToUniversalTime(),
                    "monthly" => now.AddMonths(1).Date.ToUniversalTime(),
                    _         => now.AddDays(7).Date.ToUniversalTime(),
                };

                _log.LogInformation("Report '{Name}' sent, next run: {Next}.", report.Name, report.NextRunAtUtc);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Failed to process report '{Name}'.", report.Name);
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
