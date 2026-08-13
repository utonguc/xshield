using System.Text;
using System.Text.Json;

namespace SitePlatform.Api.Services;

// Telegram Bot API ile giden mesaj/doküman gönderimi (düz HTTP, SDK yok)
public class TelegramService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<TelegramService> log)
{
    string? Token => config["Telegram:BotToken"];
    public bool IsEnabled => !string.IsNullOrWhiteSpace(Token);
    public string? BotUsername => config["Telegram:BotUsername"];

    string Api(string method) => $"https://api.telegram.org/bot{Token}/{method}";

    public async Task<bool> SendMessageAsync(long chatId, string text)
    {
        if (!IsEnabled) return false;
        try
        {
            var http = httpFactory.CreateClient();
            var payload = JsonSerializer.Serialize(new { chat_id = chatId, text, parse_mode = "HTML" });
            var res = await http.PostAsync(Api("sendMessage"),
                new StringContent(payload, Encoding.UTF8, "application/json"));
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex) { log.LogWarning(ex, "Telegram sendMessage hatası"); return false; }
    }

    public async Task<bool> SendMessageAsync(string chatId, string text)
        => long.TryParse(chatId, out var id) && await SendMessageAsync(id, text);

    // Genel POST (setMyCommands, setChatMenuButton vb.)
    public async Task<bool> PostAsync(string method, object body)
    {
        if (!IsEnabled) return false;
        try
        {
            var http = httpFactory.CreateClient();
            var payload = JsonSerializer.Serialize(body);
            var res = await http.PostAsync(Api(method),
                new StringContent(payload, Encoding.UTF8, "application/json"));
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex) { log.LogWarning(ex, "Telegram {Method} hatası", method); return false; }
    }

    // Long-polling için ham çağrı
    public async Task<string?> GetAsync(string method, string query = "")
    {
        if (!IsEnabled) return null;
        try
        {
            var http = httpFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(65);
            var res = await http.GetAsync(Api(method) + query);
            return await res.Content.ReadAsStringAsync();
        }
        catch (Exception ex) { log.LogWarning(ex, "Telegram {Method} hatası", method); return null; }
    }
}
