using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record AnnouncementDto(
    int Id,
    string Title,
    string Content,
    bool IsPinned,
    string Category,
    int CreatedById,
    DateTime CreatedAt,
    DateTime? ExpiresAt
);

public record CreateAnnouncementRequest(
    string Title,
    string Content,
    bool IsPinned,
    AnnouncementCategory Category,
    DateTime? ExpiresAt
);

public record UpdateAnnouncementRequest(
    string Title,
    string Content,
    bool IsPinned,
    AnnouncementCategory Category,
    DateTime? ExpiresAt
);
