using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record ParkingPermitDto(
    int Id,
    string PlateNumber,
    string? OwnerName,
    int? ApartmentId,
    string? ApartmentLabel,
    string? VehicleInfo,
    string PermitType,
    DateOnly? ValidUntil,
    bool IsActive,
    bool Expired,
    string? Note,
    DateTime CreatedAt
);

public record CreateParkingPermitRequest(
    string PlateNumber,
    string? OwnerName,
    int? ApartmentId,
    string? VehicleInfo,
    PermitType PermitType,
    DateOnly? ValidUntil,
    string? Note
);

public record ParkingCheckResult(
    bool Authorized,
    string Plate,
    ParkingPermitDto? Permit,
    string Message
);
