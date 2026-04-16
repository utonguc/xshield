using System.Text;
using System.Text.Json;
using ClinicPlatform.Api.Data;
using ClinicPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Services;

public interface IWhatsAppService
{
    Task<(bool ok, string? error)> SendTextAsync(
        Guid clinicId, string toNumber, string body,
        Guid? patientId = null, string? sentByName = null,
        Guid? appointmentId = null, string? messageType = null);
}

public class WhatsAppService : IWhatsAppService
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<WhatsAppService> _log;

    public WhatsAppService(AppDbContext db, IHttpClientFactory http, ILogger<WhatsAppService> log)
    {
        _db   = db;
        _http = http;
        _log  = log;
    }

    public async Task<(bool ok, string? error)> SendTextAsync(
        Guid clinicId, string toNumber, string body,
        Guid? patientId = null, string? sentByName = null,
        Guid? appointmentId = null, string? messageType = null)
    {
        var settings = await _db.WhatsAppSettings
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.IsActive);

        string status = "pending";
        string? errorDetail = null;

        if (settings is null || string.IsNullOrWhiteSpace(settings.ApiToken)
            || string.IsNullOrWhiteSpace(settings.PhoneNumberId))
        {
            _log.LogInformation("[WA MOCK] To:{To} Body:{Body}", toNumber, body);
            status = "sent"; // mock success in dev
        }
        else
        {
            try
            {
                var payload = new
                {
                    messaging_product = "whatsapp",
                    to                = toNumber.Replace("+", "").Replace(" ", ""),
                    type              = "text",
                    text              = new { preview_url = false, body }
                };

                var json    = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var client = _http.CreateClient();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {settings.ApiToken}");

                var url = $"https://graph.facebook.com/v18.0/{settings.PhoneNumberId}/messages";
                var res = await client.PostAsync(url, content);

                if (res.IsSuccessStatusCode)
                {
                    status = "sent";
                }
                else
                {
                    var errBody = await res.Content.ReadAsStringAsync();
                    errorDetail = $"HTTP {(int)res.StatusCode}: {errBody[..Math.Min(300, errBody.Length)]}";
                    status = "failed";
                    _log.LogWarning("[WA] Send failed: {Err}", errorDetail);
                }
            }
            catch (Exception ex)
            {
                errorDetail = ex.Message;
                status = "failed";
                _log.LogError(ex, "[WA] Exception while sending.");
            }
        }

        // Log
        _db.WhatsAppLogs.Add(new WhatsAppLog
        {
            ClinicId      = clinicId,
            ToNumber      = toNumber,
            MessageBody   = body,
            Status        = status,
            ErrorDetail   = errorDetail,
            PatientId     = patientId,
            SentByName    = sentByName,
            AppointmentId = appointmentId,
            MessageType   = messageType ?? "custom",
        });
        await _db.SaveChangesAsync();

        return (status == "sent", errorDetail);
    }
}
