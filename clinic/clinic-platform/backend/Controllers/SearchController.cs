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
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;
    public SearchController(AppDbContext db) => _db = db;

    private async Task<Guid?> GetClinicIdAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        return user?.ClinicId;
    }

    // GET api/search?q=mehmet&limit=5
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 5)
    {
        var clinicId = await GetClinicIdAsync();
        if (clinicId is null) return Unauthorized();

        q = (q ?? "").Trim();
        if (q.Length < 2)
            return Ok(new { patients = Array.Empty<object>(), doctors = Array.Empty<object>(), appointments = Array.Empty<object>(), tasks = Array.Empty<object>() });

        var lower = q.ToLower();

        var patients = await _db.Patients
            .Where(x => x.ClinicId == clinicId &&
                (EF.Functions.ILike(x.FirstName + " " + x.LastName, $"%{q}%") ||
                 (x.Phone    != null && EF.Functions.ILike(x.Phone, $"%{q}%")) ||
                 (x.Email    != null && EF.Functions.ILike(x.Email, $"%{q}%"))))
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(limit)
            .Select(x => new
            {
                id       = x.Id,
                type     = "patient",
                title    = x.FirstName + " " + x.LastName,
                subtitle = x.Phone ?? x.Email ?? x.LeadStatus,
                href     = "/patients/" + x.Id,
            })
            .ToListAsync();

        var doctors = await _db.Doctors
            .Where(x => x.ClinicId == clinicId && x.IsActive &&
                (EF.Functions.ILike(x.FullName, $"%{q}%") ||
                 EF.Functions.ILike(x.Branch, $"%{q}%")))
            .Take(limit)
            .Select(x => new
            {
                id       = x.Id,
                type     = "doctor",
                title    = x.FullName,
                subtitle = x.Branch,
                href     = "/doctors",
            })
            .ToListAsync();

        var appointments = await _db.Appointments
            .Include(x => x.Patient)
            .Where(x => x.ClinicId == clinicId &&
                (EF.Functions.ILike(x.ProcedureName, $"%{q}%") ||
                 (x.Patient != null && EF.Functions.ILike(x.Patient.FirstName + " " + x.Patient.LastName, $"%{q}%"))))
            .OrderByDescending(x => x.StartAtUtc)
            .Take(limit)
            .Select(x => new
            {
                id       = x.Id,
                type     = "appointment",
                title    = x.ProcedureName,
                subtitle = (x.Patient != null ? x.Patient.FirstName + " " + x.Patient.LastName : "") + " · " + x.StartAtUtc.ToString("dd.MM.yyyy HH:mm"),
                href     = "/appointments",
            })
            .ToListAsync();

        var tasks = await _db.Tasks
            .Where(x => x.ClinicId == clinicId &&
                EF.Functions.ILike(x.Title, $"%{q}%"))
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(limit)
            .Select(x => new
            {
                id       = x.Id,
                type     = "task",
                title    = x.Title,
                subtitle = x.Status + (x.Priority != null ? " · " + x.Priority : ""),
                href     = "/tasks",
            })
            .ToListAsync();

        return Ok(new { patients, doctors, appointments, tasks });
    }
}
