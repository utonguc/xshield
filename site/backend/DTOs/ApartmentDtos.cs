using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record ApartmentDto(
    int Id,
    int BlockId,
    string BlockName,
    string Number,
    int Floor,
    string? Type,
    decimal? SquareMeters,
    decimal? LandShare,
    decimal? MonthlyDues,
    string Status,
    int? OwnerId,
    string? OwnerName,
    string? OwnerPhone,
    int? ResidentId,
    string? ResidentName,
    string? ResidentPhone,
    DateTime CreatedAt
);

public record CreateApartmentRequest(
    int BlockId,
    string Number,
    int Floor,
    string? Type,
    decimal? SquareMeters,
    decimal? LandShare,
    decimal? MonthlyDues,
    ApartmentStatus Status = ApartmentStatus.Occupied
);

public record UpdateApartmentRequest(
    string Number,
    int Floor,
    string? Type,
    decimal? SquareMeters,
    decimal? LandShare,
    decimal? MonthlyDues,
    ApartmentStatus Status,
    int? OwnerId,
    int? ResidentId
);

// Formülle aidat hesaplama: taban + arsaPayı × çarpan
// BaseAmount verilirse site tabanı bununla güncellenir (kalıcı).
public record CalculateDuesRequest(int RoundTo = 0, bool Overwrite = true, decimal? BaseAmount = null);

public record CalculateDuesResult(int UpdatedCount, int SkippedNoShare, decimal BaseAmount);
