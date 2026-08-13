using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record ExtraCollectionDto(
    int Id,
    string Title,
    string? Description,
    decimal Amount,
    DateOnly? DueDate,
    int TotalApartments,
    int PaidCount,
    int PendingCount,
    decimal ExpectedTotal,
    decimal CollectedTotal,
    DateTime CreatedAt
);

public record CreateExtraCollectionRequest(
    string Title,
    string? Description,
    decimal Amount,
    DateOnly? DueDate,
    List<int> ApartmentIds
);

public record UpdateExtraCollectionRequest(
    string Title,
    string? Description,
    DateOnly? DueDate
);

public record ExtraCollectionRecordDto(
    int Id,
    int ApartmentId,
    string ApartmentNumber,
    string BlockName,
    string? ResidentName,
    decimal Amount,
    string Status,
    DateTime? PaidAt,
    string? Note
);

public record PayExtraRequest(
    decimal Amount,
    PaymentMethod Method,
    string? ReceiptNo,
    string? Note,
    DateTime? PaidAt
);

public record ResidentExtraDto(
    int Id,
    string Title,
    string? Description,
    decimal Amount,
    string Status,
    DateTime? PaidAt,
    DateOnly? DueDate
);
