namespace ClinicPlatform.Api.Services;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody);
    Task SendAsync(IEnumerable<string> recipients, string subject, string htmlBody);
}
