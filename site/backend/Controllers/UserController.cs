using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "SiteAdmin,Manager")]
public class UserController(AppDbContext db) : ControllerBase
{
    int SiteId => int.Parse(User.FindFirstValue("siteId")!);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? role)
    {
        var q = db.Users
            .Include(u => u.OwnedApartments).ThenInclude(a => a.Block)
            .Include(u => u.ResidentApartments).ThenInclude(a => a.Block)
            .Where(u => u.SiteId == SiteId);

        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, out var r))
            q = q.Where(u => u.Role == r);

        var items = await q.OrderBy(u => u.FullName).ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var u = await db.Users
            .Include(u => u.OwnedApartments).ThenInclude(a => a.Block)
            .Include(u => u.ResidentApartments).ThenInclude(a => a.Block)
            .FirstOrDefaultAsync(u => u.Id == id && u.SiteId == SiteId);
        return u is null ? NotFound() : Ok(Map(u));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.SiteId == SiteId && u.Email == req.Email))
            return BadRequest("Bu e-posta ile kayıtlı kullanıcı mevcut.");

        var user = new User
        {
            SiteId = SiteId,
            FullName = req.FullName,
            Email = req.Email,
            Phone = req.Phone,
            Role = req.Role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password)
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Ok(Map(user));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.SiteId == SiteId);
        if (user is null) return NotFound();

        user.FullName = req.FullName;
        user.Phone = req.Phone;
        user.Role = req.Role;
        user.IsActive = req.IsActive;
        await db.SaveChangesAsync();
        return Ok(Map(user));
    }

    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.SiteId == SiteId);
        if (user is null) return NotFound();
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
            return BadRequest("Şifre en az 6 karakter olmalıdır.");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SiteAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.SiteId == SiteId);
        if (user is null) return NotFound();
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return NoContent();
    }

    static UserDto Map(User u) => new(
        u.Id, u.FullName, u.Email, u.Phone, u.Role.ToString(), u.IsActive, u.CreatedAt,
        u.OwnedApartments.Select(a => $"{a.Block.Name} - {a.Number}")
            .Concat(u.ResidentApartments.Select(a => $"{a.Block.Name} - {a.Number}"))
            .Distinct().ToList()
    );
}
