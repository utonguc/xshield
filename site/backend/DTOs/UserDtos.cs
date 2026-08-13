using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record UserDto(
    int Id,
    string FullName,
    string Email,
    string? Phone,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    List<string> Apartments
);

public record CreateUserRequest(
    string FullName,
    string Email,
    string Password,
    string? Phone,
    UserRole Role = UserRole.Resident
);

public record UpdateUserRequest(
    string FullName,
    string? Phone,
    UserRole Role,
    bool IsActive
);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record ResetPasswordRequest(string NewPassword);
