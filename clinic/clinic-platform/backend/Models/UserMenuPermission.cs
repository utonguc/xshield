namespace ClinicPlatform.Api.Models;

public class UserMenuPermission
{
    public Guid   Id      { get; set; } = Guid.NewGuid();
    public Guid   UserId  { get; set; }
    public string MenuKey { get; set; } = string.Empty;

    public User? User { get; set; }
}
