namespace SitePlatform.Api.DTOs;

public record ContactDto(
    int UserId,
    string FullName,
    string Role,
    List<string> Apartments,
    int UnreadCount,
    string? LastMessage,
    DateTime? LastMessageAt
);

public record MessageDto(
    int Id,
    int FromUserId,
    string FromName,
    int ToUserId,
    string Content,
    bool IsRead,
    bool IsMine,
    DateTime CreatedAt
);

public record SendMessageRequest(int ToUserId, string Content);
