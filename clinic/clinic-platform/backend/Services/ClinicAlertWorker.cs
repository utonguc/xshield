using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Services;

/// <summary>
/// Runs every hour. Generates system notifications for:
///   - Stock items at or below minimum quantity
///   - Assets with overdue or upcoming maintenance (within 7 days)
///   - Overdue invoices
///   - New pending appointment requests (reminder after 2h)
/// Each alert is deduplicated — same alert won't be re-created within 24h.
/// </summary>
public class ClinicAlertWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ClinicAlertWorker> _log;
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    public ClinicAlertWorker(IServiceScopeFactory scopeFactory, ILogger<ClinicAlertWorker> log)
    {
        _scopeFactory = scopeFactory;
        _log          = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("ClinicAlertWorker started.");
        // Initial delay — let the app warm up
        await Task.Delay(TimeSpan.FromSeconds(30), ct).ConfigureAwait(false);

        while (!ct.IsCancellationRequested)
        {
            try   { await RunChecksAsync(ct); }
            catch (Exception ex) { _log.LogError(ex, "ClinicAlertWorker error."); }

            await Task.Delay(Interval, ct).ConfigureAwait(false);
        }
    }

    private async Task RunChecksAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var clinicIds = await db.Clinics.Where(x => x.IsActive).Select(x => x.Id).ToListAsync(ct);

        foreach (var clinicId in clinicIds)
        {
            var adminUserIds = await db.Users
                .Include(x => x.Role)
                .Where(x => x.ClinicId == clinicId && x.IsActive &&
                    x.Role != null && (x.Role.Name == "SuperAdmin" || x.Role.Name == "KlinikYonetici"))
                .Select(x => x.Id)
                .ToListAsync(ct);

            if (adminUserIds.Count == 0) continue;

            await CheckLowStockAsync(db, clinicId, adminUserIds, ct);
            await CheckAssetMaintenanceAsync(db, clinicId, adminUserIds, ct);
            await CheckOverdueInvoicesAsync(db, clinicId, adminUserIds, ct);
            await CheckPendingRequestsAsync(db, clinicId, adminUserIds, ct);
        }

        await db.SaveChangesAsync(ct);
    }

    private static async Task CheckLowStockAsync(AppDbContext db, Guid clinicId, List<Guid> userIds, CancellationToken ct)
    {
        var lowStock = await db.StockItems
            .Where(x => x.ClinicId == clinicId && x.Quantity <= x.MinQuantity)
            .ToListAsync(ct);

        foreach (var item in lowStock)
        {
            var key = $"low_stock_{item.Id}";
            if (await RecentNotifExistsAsync(db, clinicId, key, ct)) continue;

            foreach (var uid in userIds)
            {
                db.Notifications.Add(new Notification
                {
                    ClinicId     = clinicId,
                    UserId       = uid,
                    Title        = "Düşük Stok Uyarısı",
                    Message      = $"{item.Name} — stok: {item.Quantity} {item.Unit} (min: {item.MinQuantity})",
                    Type         = "warning",
                    Link         = "/stock",
                    DedupeKey    = key,
                });
            }
        }
    }

    private static async Task CheckAssetMaintenanceAsync(AppDbContext db, Guid clinicId, List<Guid> userIds, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var dueSoon = await db.Assets
            .Where(x => x.ClinicId == clinicId && x.NextMaintenanceAt.HasValue &&
                x.NextMaintenanceAt.Value <= now.AddDays(7))
            .ToListAsync(ct);

        foreach (var asset in dueSoon)
        {
            var isOverdue = asset.NextMaintenanceAt!.Value < now;
            var key       = $"asset_maint_{asset.Id}";
            if (await RecentNotifExistsAsync(db, clinicId, key, ct)) continue;

            foreach (var uid in userIds)
            {
                db.Notifications.Add(new Notification
                {
                    ClinicId     = clinicId,
                    UserId       = uid,
                    Title        = isOverdue ? "Bakım Gecikti!" : "Bakım Yaklaşıyor",
                    Message      = $"{asset.Name} — {(isOverdue ? "bakım tarihi geçti" : $"bakım tarihi: {asset.NextMaintenanceAt:dd.MM.yyyy}")}",
                    Type         = isOverdue ? "error" : "warning",
                    Link         = "/assets",
                    DedupeKey    = key,
                });
            }
        }
    }

    private static async Task CheckOverdueInvoicesAsync(AppDbContext db, Guid clinicId, List<Guid> userIds, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var newlyOverdue = await db.Invoices
            .Where(x => x.ClinicId == clinicId && x.Status == "Sent" &&
                x.DueAtUtc.HasValue && x.DueAtUtc.Value < now)
            .Take(10)
            .ToListAsync(ct);

        foreach (var inv in newlyOverdue)
        {
            var key = $"overdue_inv_{inv.Id}";
            if (await RecentNotifExistsAsync(db, clinicId, key, ct)) continue;

            foreach (var uid in userIds)
            {
                db.Notifications.Add(new Notification
                {
                    ClinicId     = clinicId,
                    UserId       = uid,
                    Title        = "Vadesi Geçen Fatura",
                    Message      = $"{inv.InvoiceNo} — {inv.Total:N0} {inv.Currency}, vade: {inv.DueAtUtc:dd.MM.yyyy}",
                    Type         = "error",
                    Link         = "/finance",
                    DedupeKey    = key,
                });
            }
        }
    }

    private static async Task CheckPendingRequestsAsync(AppDbContext db, Guid clinicId, List<Guid> userIds, CancellationToken ct)
    {
        var twoHoursAgo = DateTime.UtcNow.AddHours(-2);
        var oldPending = await db.AppointmentRequests
            .Where(x => x.ClinicId == clinicId && x.Status == "Pending" &&
                x.CreatedAtUtc < twoHoursAgo)
            .CountAsync(ct);

        if (oldPending == 0) return;

        var key = $"pending_appt_req_{clinicId}_{DateTime.UtcNow:yyyyMMddHH}";
        if (await RecentNotifExistsAsync(db, clinicId, key, ct)) return;

        foreach (var uid in userIds)
        {
            db.Notifications.Add(new Notification
            {
                ClinicId     = clinicId,
                UserId       = uid,
                Title        = "Bekleyen Randevu İstekleri",
                Message      = $"{oldPending} randevu isteği 2 saatten fazladır bekliyor.",
                Type         = "warning",
                Link         = "/requests",
                DedupeKey    = key,
            });
        }
    }

    private static async Task<bool> RecentNotifExistsAsync(AppDbContext db, Guid clinicId, string key, CancellationToken ct)
    {
        var since = DateTime.UtcNow.AddHours(-20);
        return await db.Notifications.AnyAsync(
            x => x.ClinicId == clinicId && x.DedupeKey == key && x.CreatedAtUtc > since, ct);
    }
}

