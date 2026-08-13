using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SitePlatform.Api.Data;
using SitePlatform.Api.DTOs;
using SitePlatform.Api.Models;
using SitePlatform.Api.Services;

namespace SitePlatform.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, JwtService jwt) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterSiteRequest req)
    {
        if (await db.Sites.AnyAsync(s => s.Users.Any(u => u.Email == req.AdminEmail)))
            return BadRequest("Bu e-posta ile kayıtlı bir hesap mevcut.");

        var site = new Site
        {
            Name = req.SiteName,
            Address = req.SiteAddress,
            Phone = req.SitePhone,
            Tier = SubscriptionTier.Free
        };
        db.Sites.Add(site);
        await db.SaveChangesAsync();

        var admin = new User
        {
            SiteId = site.Id,
            FullName = req.AdminFullName,
            Email = req.AdminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.AdminPassword),
            Role = UserRole.SiteAdmin
        };
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        return Ok(new AuthResponse(jwt.Generate(admin), admin.Role.ToString(), site.Id, admin.Id, admin.FullName));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await db.Users
            .Include(u => u.Site)
            .FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized("E-posta veya şifre hatalı.");

        if (!user.Site.IsActive)
            return Unauthorized("Bu site hesabı aktif değil.");

        return Ok(new AuthResponse(jwt.Generate(user), user.Role.ToString(), user.SiteId, user.Id, user.FullName));
    }
}
