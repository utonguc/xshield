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
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    public TasksController(AppDbContext db) => _db = db;

    private async Task<(Guid userId, Guid clinicId)?> GetContextAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return null;
        return (user.Id, user.ClinicId);
    }

    private static TaskResponse ToResponse(TaskItem t) => new()
    {
        Id             = t.Id,
        Title          = t.Title,
        Description    = t.Description,
        Status         = t.Status,
        Priority       = t.Priority,
        AssignedToId   = t.AssignedToId,
        AssignedToName = t.AssignedTo?.FullName,
        CreatedById    = t.CreatedById,
        CreatedByName  = t.CreatedBy?.FullName,
        DueAtUtc       = t.DueAtUtc,
        CreatedAtUtc   = t.CreatedAtUtc,
        IsOverdue      = t.DueAtUtc.HasValue && t.DueAtUtc.Value < DateTime.UtcNow && t.Status != TaskStatuses.Done,
    };

    // GET api/tasks
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] Guid? assignedToId)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var q = _db.Tasks
            .Where(x => x.ClinicId == clinicId)
            .Include(x => x.AssignedTo)
            .Include(x => x.CreatedBy)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        if (assignedToId.HasValue)              q = q.Where(x => x.AssignedToId == assignedToId);

        var items = await q.OrderBy(x => x.DueAtUtc).ThenByDescending(x => x.CreatedAtUtc).ToListAsync();
        return Ok(items.Select(ToResponse));
    }

    // GET api/tasks/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var task = await _db.Tasks.Where(x => x.ClinicId == clinicId && x.Id == id)
            .Include(x => x.AssignedTo).Include(x => x.CreatedBy)
            .FirstOrDefaultAsync();
        return task is null ? NotFound() : Ok(ToResponse(task));
    }

    // POST api/tasks
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (userId, clinicId) = ctx.Value;

        if (!TaskPriorities.All.Contains(req.Priority))
            return BadRequest(new { message = "Geçersiz öncelik." });

        var task = new TaskItem
        {
            ClinicId     = clinicId,
            Title        = req.Title.Trim(),
            Description  = req.Description?.Trim(),
            Priority     = req.Priority,
            AssignedToId = req.AssignedToId,
            CreatedById  = userId,
            DueAtUtc     = req.DueAtUtc,
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        var created = await _db.Tasks.Where(x => x.Id == task.Id)
            .Include(x => x.AssignedTo).Include(x => x.CreatedBy).FirstAsync();
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ToResponse(created));
    }

    // PUT api/tasks/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var task = await _db.Tasks.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (task is null) return NotFound();

        if (!TaskStatuses.All.Contains(req.Status))
            return BadRequest(new { message = "Geçersiz durum." });

        task.Title        = req.Title.Trim();
        task.Description  = req.Description?.Trim();
        task.Status       = req.Status;
        task.Priority     = req.Priority;
        task.AssignedToId = req.AssignedToId;
        task.DueAtUtc     = req.DueAtUtc;
        task.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Görev güncellendi." });
    }

    // PATCH api/tasks/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusRequest req)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        if (!TaskStatuses.All.Contains(req.Status))
            return BadRequest(new { message = "Geçersiz durum." });

        var task = await _db.Tasks.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (task is null) return NotFound();

        task.Status       = req.Status;
        task.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Durum güncellendi." });
    }

    // DELETE api/tasks/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ctx = await GetContextAsync();
        if (ctx is null) return Unauthorized();
        var (_, clinicId) = ctx.Value;

        var task = await _db.Tasks.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Id == id);
        if (task is null) return NotFound();

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Görev silindi." });
    }
}
