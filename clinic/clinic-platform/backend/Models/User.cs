namespace ClinicPlatform.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ClinicId { get; set; }
    public Clinic? Clinic { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Guid? RoleId { get; set; }
    public Role? Role { get; set; }

    public string? ProfilePhotoUrl { get; set; }
}
