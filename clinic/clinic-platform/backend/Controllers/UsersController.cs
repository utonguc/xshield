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
[Authorize(Roles = "SuperAdmin,KlinikYonetici")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(sub) || !Guid.TryParse(sub, out var userId))
            return null;

        return await _db.Users.Include(x => x.Role).FirstOrDefaultAsync(x => x.Id == userId);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser is null) return Unauthorized();

        var users = await _db.Users
            .Include(x => x.Role)
            .Where(x => x.ClinicId == currentUser.ClinicId)
            .OrderBy(x => x.FullName)
            .Select(x => new UserListItemResponse
            {
                Id = x.Id,
                ClinicId = x.ClinicId,
                FullName = x.FullName,
                UserName = x.UserName,
                Email = x.Email,
                IsActive = x.IsActive,
                RoleId = x.RoleId,
                RoleName = x.Role != null ? x.Role.Name : null
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _db.Roles
            .OrderBy(x => x.Name)
            .Select(x => new RoleListItemResponse
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync();

        return Ok(roles);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest("Ad soyad zorunlu.");
        if (string.IsNullOrWhiteSpace(request.UserName))
            return BadRequest("Kullanıcı adı zorunlu.");
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("E-posta zorunlu.");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return BadRequest("Şifre en az 6 karakter olmalı.");

        var roleExists = await _db.Roles.AnyAsync(x => x.Id == request.RoleId);
        if (!roleExists)
            return NotFound("Rol bulunamadı.");

        var userNameExists = await _db.Users.AnyAsync(x => x.ClinicId == currentUser.ClinicId && x.UserName == request.UserName);
        if (userNameExists)
            return Conflict("Bu kullanıcı adı bu klinikte zaten kullanılıyor.");

        var emailExists = await _db.Users.AnyAsync(x => x.ClinicId == currentUser.ClinicId && x.Email == request.Email);
        if (emailExists)
            return Conflict("Bu e-posta bu klinikte zaten kullanılıyor.");

        var user = new User
        {
            ClinicId = currentUser.ClinicId,
            FullName = request.FullName,
            UserName = request.UserName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId,
            IsActive = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(user.Id);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser is null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id && x.ClinicId == currentUser.ClinicId);
        if (user is null)
            return NotFound("Kullanıcı bulunamadı.");

        var roleExists = await _db.Roles.AnyAsync(x => x.Id == request.RoleId);
        if (!roleExists)
            return NotFound("Rol bulunamadı.");

        var emailUsedByAnother = await _db.Users.AnyAsync(x =>
            x.ClinicId == currentUser.ClinicId &&
            x.Email == request.Email &&
            x.Id != id);

        if (emailUsedByAnother)
            return Conflict("Bu e-posta başka bir kullanıcıda kayıtlı.");

        user.FullName = request.FullName;
        user.Email = request.Email;
        user.RoleId = request.RoleId;
        user.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        return Ok(user.Id);
    }
}
