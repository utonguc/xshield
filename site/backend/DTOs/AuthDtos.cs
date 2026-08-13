namespace SitePlatform.Api.DTOs;

public record RegisterSiteRequest(
    string SiteName,
    string? SiteAddress,
    string? SitePhone,
    string AdminFullName,
    string AdminEmail,
    string AdminPassword
);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string Token, string Role, int SiteId, int UserId, string FullName);
