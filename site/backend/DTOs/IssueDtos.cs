using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record IssueDto(
    int Id,
    string Title,
    string Description,
    string Status,
    string Priority,
    string Category,
    int? ApartmentId,
    string? ApartmentNumber,
    string? BlockName,
    int CreatedById,
    string CreatedByName,
    int? AssignedToId,
    string? AssignedToName,
    string? Resolution,
    DateTime? ResolvedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateIssueRequest(
    string Title,
    string Description,
    IssuePriority Priority,
    IssueCategory Category,
    int? ApartmentId
);

public record UpdateIssueRequest(
    string Title,
    string Description,
    IssueStatus Status,
    IssuePriority Priority,
    IssueCategory Category,
    int? AssignedToId,
    string? Resolution
);
