using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicPlatform.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditController(AppDbContext db) => _db = db;

    private async Task<Guid?> GetClinicIdAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.Where(x => x.Id == userId).Select(x => (Guid?)x.ClinicId).FirstOrDefaultAsync();
    }

    // GET api/audit?entityType=Patient&action=Created&search=&page=1&pageSize=50
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] string? search,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        pageSize = Math.Clamp(pageSize, 1, 200);
        page     = Math.Max(1, page);

        var q = _db.AuditLogs
            .Include(a => a.User)
            .Where(a => a.ClinicId == clinicId.Value);

        if (!string.IsNullOrWhiteSpace(entityType))
            q = q.Where(a => a.EntityType == entityType);

        if (!string.IsNullOrWhiteSpace(action))
            q = q.Where(a => a.Action == action);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            q = q.Where(a =>
                a.Description.ToLower().Contains(s) ||
                a.EntityType.ToLower().Contains(s)  ||
                (a.User != null && a.User.FullName.ToLower().Contains(s)));
        }

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.EntityType,
                a.EntityId,
                a.Action,
                a.Description,
                a.ChangesJson,
                a.IpAddress,
                a.CreatedAtUtc,
                UserName = a.User != null ? a.User.FullName : "Sistem",
                UserRole = a.User != null ? a.User.Role!.Name : null,
            })
            .ToListAsync();

        Response.Headers["X-Total-Count"] = total.ToString();
        return Ok(new { items, total, page, pageSize });
    }

    // GET api/audit/entity-types  — distinct entity types for filter
    [HttpGet("entity-types")]
    public async Task<IActionResult> EntityTypes()
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        var types = await _db.AuditLogs
            .Where(a => a.ClinicId == clinicId.Value)
            .Select(a => a.EntityType)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return Ok(types);
    }
}
