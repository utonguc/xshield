using ClinicPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Security.Claims;
using System.Text.Json;

namespace ClinicPlatform.Api.Data;

/// <summary>
/// EF Core interceptor that automatically creates AuditLog entries
/// whenever tracked entities are added, modified, or deleted.
/// Runs inside the same transaction as the actual SaveChanges call.
/// </summary>
public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _http;

    public AuditInterceptor(IHttpContextAccessor http) => _http = http;

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        AddAuditEntries(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        AddAuditEntries(eventData.Context);
        return ValueTask.FromResult(result);
    }

    private void AddAuditEntries(DbContext? ctx)
    {
        if (ctx is null) return;

        // Don't recursively audit AuditLog itself
        var entries = ctx.ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog &&
                        e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (entries.Count == 0) return;

        // Try to extract userId and clinicId from JWT
        var httpCtx  = _http.HttpContext;
        Guid? userId  = null;
        Guid? clinicId = null;
        string? ip    = httpCtx?.Connection.RemoteIpAddress?.ToString();

        if (httpCtx?.User.Identity?.IsAuthenticated == true)
        {
            var sub = httpCtx.User.FindFirstValue("sub")
                   ?? httpCtx.User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (Guid.TryParse(sub, out var uid)) userId = uid;
        }

        foreach (var entry in entries)
        {
            // Try to read ClinicId from the entity
            var clinicProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "ClinicId");
            if (clinicProp?.CurrentValue is Guid cid) clinicId = cid;

            if (clinicId is null) continue; // Skip entities without ClinicId scope

            var entityType = entry.Entity.GetType().Name;
            var entityId   = entry.Properties
                .FirstOrDefault(p => p.Metadata.IsPrimaryKey())
                ?.CurrentValue?.ToString() ?? "";

            string action;
            string description;
            string? changesJson = null;

            switch (entry.State)
            {
                case EntityState.Added:
                    action      = AuditActions.Created;
                    description = $"{entityType} oluşturuldu.";
                    break;

                case EntityState.Deleted:
                    action      = AuditActions.Deleted;
                    description = $"{entityType} silindi.";
                    break;

                case EntityState.Modified:
                    var changes = new Dictionary<string, object?[]>();
                    foreach (var prop in entry.Properties.Where(p => p.IsModified && !p.Metadata.IsPrimaryKey()))
                    {
                        // Skip large text blobs and timestamps from diff
                        var name = prop.Metadata.Name;
                        if (name is "UpdatedAtUtc" or "PasswordHash") continue;
                        changes[name] = [prop.OriginalValue, prop.CurrentValue];
                    }

                    // Special case: status change
                    if (changes.ContainsKey("Status") || changes.ContainsKey("LeadStatus"))
                    {
                        action = AuditActions.StatusChanged;
                        description = $"{entityType} durumu güncellendi.";
                    }
                    else
                    {
                        action      = AuditActions.Updated;
                        description = $"{entityType} güncellendi.";
                    }

                    if (changes.Count > 0)
                    {
                        try { changesJson = JsonSerializer.Serialize(changes); }
                        catch { /* ignore */ }
                    }
                    break;

                default:
                    continue;
            }

            ctx.Set<AuditLog>().Add(new AuditLog
            {
                ClinicId    = clinicId.Value,
                UserId      = userId,
                EntityType  = entityType,
                EntityId    = entityId,
                Action      = action,
                Description = description,
                ChangesJson = changesJson,
                IpAddress   = ip,
            });
        }
    }
}
