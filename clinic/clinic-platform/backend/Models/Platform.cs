namespace ClinicPlatform.Api.Models;

// ── Platform Duyuruları (SuperAdmin → Klinikler) ──────────────────────────────

public class PlatformAnnouncement
{
    public Guid      Id           { get; set; } = Guid.NewGuid();
    public string    Title        { get; set; } = string.Empty;
    public string    Body         { get; set; } = string.Empty;
    public string    Type         { get; set; } = "info"; // info, warning, success, error
    public bool      IsPublished  { get; set; } = true;
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime  CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<PlatformAnnouncementRead> Reads { get; set; } = new();
}

public class PlatformAnnouncementRead
{
    public Guid     Id             { get; set; } = Guid.NewGuid();
    public Guid     AnnouncementId { get; set; }
    public Guid     ClinicId       { get; set; }
    public DateTime ReadAtUtc      { get; set; } = DateTime.UtcNow;

    public PlatformAnnouncement? Announcement { get; set; }
}

// ── Destek Talepleri (Klinik → SuperAdmin) ────────────────────────────────────

public static class SupportTicketStatuses
{
    public const string Open       = "Open";
    public const string InProgress = "InProgress";
    public const string Resolved   = "Resolved";
}

public class SupportTicket
{
    public Guid     Id           { get; set; } = Guid.NewGuid();
    public Guid     ClinicId     { get; set; }
    public string   ClinicName   { get; set; } = string.Empty;
    public string   Subject      { get; set; } = string.Empty;
    public string   Body         { get; set; } = string.Empty;
    public string?  PageUrl      { get; set; }
    public string   Status       { get; set; } = SupportTicketStatuses.Open;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<SupportTicketReply> Replies { get; set; } = new();
}

public class SupportTicketReply
{
    public Guid     Id           { get; set; } = Guid.NewGuid();
    public Guid     TicketId     { get; set; }
    public string   Body         { get; set; } = string.Empty;
    public bool     IsFromAdmin  { get; set; }
    public string   AuthorName   { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public SupportTicket? Ticket { get; set; }
}
