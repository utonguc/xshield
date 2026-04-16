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
public class StockController : ControllerBase
{
    private readonly AppDbContext _db;
    public StockController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId);
    }

    private static StockItemResponse ToResponse(StockItem s)
    {
        var now = DateTime.UtcNow;
        return new StockItemResponse
        {
            Id           = s.Id,
            Name         = s.Name,
            Category     = s.Category,
            Unit         = s.Unit,
            Barcode      = s.Barcode,
            Supplier     = s.Supplier,
            UnitCost     = s.UnitCost,
            Quantity     = s.Quantity,
            MinQuantity  = s.MinQuantity,
            IsLow        = s.Quantity <= s.MinQuantity,
            ExpiresAtUtc = s.ExpiresAtUtc,
            IsExpired    = s.ExpiresAtUtc.HasValue && s.ExpiresAtUtc.Value < now,
            ExpiresSoon  = s.ExpiresAtUtc.HasValue && s.ExpiresAtUtc.Value >= now && s.ExpiresAtUtc.Value < now.AddDays(30),
            CreatedAtUtc = s.CreatedAtUtc,
        };
    }

    // GET api/stock?category=&search=&lowOnly=
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool    lowOnly = false)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var q = _db.StockItems.Where(x => x.ClinicId == clinicId).AsQueryable();
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
        if (!string.IsNullOrWhiteSpace(search))   q = q.Where(x => x.Name.Contains(search) || (x.Barcode != null && x.Barcode.Contains(search)));
        if (lowOnly) q = q.Where(x => x.Quantity <= x.MinQuantity);

        var items = await q.OrderBy(x => x.Name).ToListAsync();
        return Ok(items.Select(ToResponse));
    }

    // GET api/stock/summary
    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var items = await _db.StockItems.Where(x => x.ClinicId == clinicId).ToListAsync();
        var now   = DateTime.UtcNow;
        return Ok(new
        {
            totalItems   = items.Count,
            lowStock     = items.Count(x => x.Quantity <= x.MinQuantity),
            expiredItems = items.Count(x => x.ExpiresAtUtc.HasValue && x.ExpiresAtUtc.Value < now),
            expireSoon   = items.Count(x => x.ExpiresAtUtc.HasValue && x.ExpiresAtUtc.Value >= now && x.ExpiresAtUtc.Value < now.AddDays(30)),
            totalValue   = items.Sum(x => x.Quantity * x.UnitCost),
        });
    }

    // GET api/stock/categories
    [HttpGet("categories")]
    public async Task<IActionResult> Categories()
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var cats = await _db.StockItems
            .Where(x => x.ClinicId == clinicId && x.Category != null)
            .Select(x => x.Category!).Distinct().OrderBy(x => x).ToListAsync();
        return Ok(cats);
    }

    // GET api/stock/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var item = await _db.StockItems.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        return item is null ? NotFound() : Ok(ToResponse(item));
    }

    // GET api/stock/{id}/movements
    [HttpGet("{id:guid}/movements")]
    public async Task<IActionResult> Movements(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var exists = await _db.StockItems.AnyAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (!exists) return NotFound();

        var moves = await _db.StockMovements
            .Where(x => x.StockItemId == id)
            .Include(x => x.User)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(50)
            .Select(x => new StockMovementResponse
            {
                Id           = x.Id,
                Type         = x.Type,
                Quantity     = x.Quantity,
                Note         = x.Note,
                UserName     = x.User != null ? x.User.FullName : null,
                CreatedAtUtc = x.CreatedAtUtc,
            })
            .ToListAsync();
        return Ok(moves);
    }

    // POST api/stock
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStockItemRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Ürün adı zorunlu." });

        var item = new StockItem
        {
            ClinicId     = clinicId,
            Name         = req.Name.Trim(),
            Category     = req.Category?.Trim(),
            Unit         = req.Unit?.Trim(),
            Barcode      = req.Barcode?.Trim(),
            Supplier     = req.Supplier?.Trim(),
            UnitCost     = req.UnitCost,
            Quantity     = req.Quantity,
            MinQuantity  = req.MinQuantity,
            ExpiresAtUtc = req.ExpiresAtUtc,
        };
        _db.StockItems.Add(item);

        if (req.Quantity > 0)
        {
            _db.StockMovements.Add(new StockMovement
            {
                StockItemId = item.Id,
                Type        = StockMovementTypes.In,
                Quantity    = req.Quantity,
                Note        = "İlk stok girişi",
            });
        }

        await _db.SaveChangesAsync();
        return Ok(ToResponse(item));
    }

    // PUT api/stock/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStockItemRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var item = await _db.StockItems.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (item is null) return NotFound();

        item.Name         = req.Name.Trim();
        item.Category     = req.Category?.Trim();
        item.Unit         = req.Unit?.Trim();
        item.Barcode      = req.Barcode?.Trim();
        item.Supplier     = req.Supplier?.Trim();
        item.UnitCost     = req.UnitCost;
        item.MinQuantity  = req.MinQuantity;
        item.ExpiresAtUtc = req.ExpiresAtUtc;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Güncellendi." });
    }

    // POST api/stock/{id}/movement
    [HttpPost("{id:guid}/movement")]
    public async Task<IActionResult> AddMovement(Guid id, [FromBody] StockMovementRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId) = ctx.Value;

        var item = await _db.StockItems.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (item is null) return NotFound();
        if (req.Quantity <= 0) return BadRequest(new { message = "Miktar 0'dan büyük olmalı." });

        if (!StockMovementTypes.In.Equals(req.Type) &&
            !StockMovementTypes.Out.Equals(req.Type) &&
            !StockMovementTypes.Adjust.Equals(req.Type))
            return BadRequest(new { message = "Geçersiz hareket tipi." });

        switch (req.Type)
        {
            case StockMovementTypes.In:
                item.Quantity += req.Quantity; break;
            case StockMovementTypes.Out:
                if (item.Quantity < req.Quantity)
                    return BadRequest(new { message = "Stok yetersiz." });
                item.Quantity -= req.Quantity; break;
            case StockMovementTypes.Adjust:
                item.Quantity = req.Quantity; break;
        }

        item.UpdatedAtUtc = DateTime.UtcNow;
        _db.StockMovements.Add(new StockMovement
        {
            StockItemId = item.Id,
            Type        = req.Type,
            Quantity    = req.Quantity,
            Note        = req.Note,
            UserId      = userId,
        });

        await _db.SaveChangesAsync();
        return Ok(ToResponse(item));
    }

    // DELETE api/stock/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var item = await _db.StockItems.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (item is null) return NotFound();
        _db.StockItems.Remove(item);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Ürün silindi." });
    }
}
