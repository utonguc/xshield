namespace SitePlatform.Api.DTOs;

public record VisitorDto(
    int Id,
    string FullName,
    string? Phone,
    int? ApartmentId,
    string? ApartmentLabel,
    string? PlateNumber,
    string? Note,
    DateTime EntryTime,
    DateTime? ExitTime,
    bool Inside,
    DateTime CreatedAt
);

public record CreateVisitorRequest(
    string FullName,
    string? Phone,
    int? ApartmentId,
    string? PlateNumber,
    string? Note,
    DateTime? EntryTime
);

public record UpdateVisitorRequest(
    string FullName,
    string? Phone,
    int? ApartmentId,
    string? PlateNumber,
    string? Note,
    DateTime? EntryTime,
    DateTime? ExitTime
);
