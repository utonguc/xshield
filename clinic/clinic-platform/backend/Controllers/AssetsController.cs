using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.DTOs;
using ClinicPlatform.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AssetsController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId);
    }

    private static AssetResponse ToResponse(Asset a)
    {
        var now = DateTime.UtcNow;
        return new AssetResponse
        {
            Id                = a.Id,
            Name              = a.Name,
            Category          = a.Category,
            Brand             = a.Brand,
            Model             = a.Model,
            SerialNo          = a.SerialNo,
            Status            = a.Status,
            Location          = a.Location,
            PurchasePrice     = a.PurchasePrice,
            PurchasedAt       = a.PurchasedAt,
            WarrantyUntil     = a.WarrantyUntil,
            WarrantyExpired   = a.WarrantyUntil.HasValue && a.WarrantyUntil.Value < now,
            NextMaintenanceAt = a.NextMaintenanceAt,
            MaintenanceDue    = a.NextMaintenanceAt.HasValue && a.NextMaintenanceAt.Value <= now.AddDays(7),
            Notes             = a.Notes,
            CreatedAtUtc      = a.CreatedAtUtc,
        };
    }

    // GET api/assets?status=&category=&search=
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? category,
        [FromQuery] string? search)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var q = _db.Assets.Where(x => x.ClinicId == clinicId).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))   q = q.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
        if (!string.IsNullOrWhiteSpace(search))   q = q.Where(x => x.Name.Contains(search) || (x.SerialNo != null && x.SerialNo.Contains(search)));

        var items = await q.OrderBy(x => x.Name).ToListAsync();
        return Ok(items.Select(ToResponse));
    }

    // GET api/assets/summary
    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var all = await _db.Assets.Where(x => x.ClinicId == clinicId).ToListAsync();
        var now = DateTime.UtcNow;
        return Ok(new
        {
            total          = all.Count,
            active         = all.Count(x => x.Status == AssetStatuses.Active),
            maintenance    = all.Count(x => x.Status == AssetStatuses.Maintenance),
            maintenanceDue = all.Count(x => x.NextMaintenanceAt.HasValue && x.NextMaintenanceAt.Value <= now.AddDays(7)),
            warrantyExpired = all.Count(x => x.WarrantyUntil.HasValue && x.WarrantyUntil.Value < now),
            totalValue     = all.Sum(x => x.PurchasePrice ?? 0),
        });
    }

    // POST api/assets
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAssetRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Demirbaş adı zorunlu." });
        if (!AssetStatuses.All.Contains(req.Status)) req.Status = AssetStatuses.Active;

        var asset = new Asset
        {
            ClinicId          = clinicId,
            Name              = req.Name.Trim(),
            Category          = req.Category?.Trim(),
            Brand             = req.Brand?.Trim(),
            Model             = req.Model?.Trim(),
            SerialNo          = req.SerialNo?.Trim(),
            Status            = req.Status,
            Location          = req.Location?.Trim(),
            PurchasePrice     = req.PurchasePrice,
            PurchasedAt       = req.PurchasedAt,
            WarrantyUntil     = req.WarrantyUntil,
            NextMaintenanceAt = req.NextMaintenanceAt,
            Notes             = req.Notes?.Trim(),
        };
        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();
        return Ok(ToResponse(asset));
    }

    // PUT api/assets/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAssetRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var asset = await _db.Assets.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (asset is null) return NotFound();

        asset.Name              = req.Name.Trim();
        asset.Category          = req.Category?.Trim();
        asset.Brand             = req.Brand?.Trim();
        asset.Model             = req.Model?.Trim();
        asset.SerialNo          = req.SerialNo?.Trim();
        asset.Status            = AssetStatuses.All.Contains(req.Status) ? req.Status : asset.Status;
        asset.Location          = req.Location?.Trim();
        asset.PurchasePrice     = req.PurchasePrice;
        asset.PurchasedAt       = req.PurchasedAt;
        asset.WarrantyUntil     = req.WarrantyUntil;
        asset.NextMaintenanceAt = req.NextMaintenanceAt;
        asset.Notes             = req.Notes?.Trim();
        asset.UpdatedAtUtc      = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Güncellendi." });
    }

    // DELETE api/assets/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var asset = await _db.Assets.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (asset is null) return NotFound();
        _db.Assets.Remove(asset);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
