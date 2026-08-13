using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record DuesPeriodDto(
    int Id,
    string Title,
    decimal Amount,
    DateOnly DueDate,
    int Year,
    int Month,
    string? Description,
    int TotalApartments,
    int PaidCount,
    int PendingCount,
    int OverdueCount,
    decimal CollectedAmount,
    DateTime CreatedAt
);

public record CreateDuesPeriodRequest(
    string Title,
    decimal Amount,
    DateOnly DueDate,
    int Year,
    int Month,
    string? Description,
    bool PerApartment = false   // true: her daire kendi MonthlyDues tutarını öder
);

public record DuesRecordDto(
    int Id,
    int DuesPeriodId,
    string PeriodTitle,
    int ApartmentId,
    string ApartmentNumber,
    string BlockName,
    decimal Amount,
    string Status,
    DateTime? PaidAt,
    string? Note
);

public record MarkPaidRequest(
    decimal Amount,
    PaymentMethod Method,
    string? ReceiptNo,
    string? Note,
    DateTime? PaidAt
);

public record ResidentDuesDto(
    int DuesPeriodId,
    string PeriodTitle,
    int Year,
    int Month,
    decimal Amount,
    string Status,
    DateTime? PaidAt,
    DateOnly DueDate
);
