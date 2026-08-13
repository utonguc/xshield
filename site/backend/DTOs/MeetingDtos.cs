using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record MeetingDto(
    int Id,
    string Title,
    string? Description,
    string? Agenda,
    DateTime MeetingDate,
    string? Location,
    string Status,
    string? Minutes,
    int CreatedById,
    DateTime CreatedAt
);

public record CreateMeetingRequest(
    string Title,
    string? Description,
    string? Agenda,
    DateTime MeetingDate,
    string? Location
);

public record UpdateMeetingRequest(
    string Title,
    string? Description,
    string? Agenda,
    DateTime MeetingDate,
    string? Location,
    MeetingStatus Status,
    string? Minutes
);
