using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record SiteDto(
    int Id,
    string Name,
    string? Address,
    string? Phone,
    string? Email,
    string? LogoUrl,
    string? TaxNumber,
    string Tier,
    decimal MonthlyPrice,
    decimal DuesBaseAmount,
    string? TelegramGroupChatId,
    bool IsActive,
    int ApartmentCount,
    DateTime CreatedAt
);

public record TransferAdminRequest(int NewAdminUserId, string CurrentPassword);

public record UpdateSiteRequest(
    string Name,
    string? Address,
    string? Phone,
    string? Email,
    string? TaxNumber,
    decimal DuesBaseAmount = 0,
    string? TelegramGroupChatId = null
);

public record DashboardDto(
    int TotalApartments,
    int TotalResidents,
    int PendingDues,
    decimal TotalDuesThisMonth,
    decimal CollectedThisMonth,
    int OpenIssues,
    int UpcomingMeetings,
    string Tier,
    decimal MonthlyPrice,
    List<RecentPaymentDto> RecentPayments,
    List<RecentIssueDto> RecentIssues,
    List<TrendPointDto> CollectionTrend,
    List<CategoryAmountDto> ExpenseBreakdown
);

public record TrendPointDto(string Label, decimal Collected, decimal Expense);
public record CategoryAmountDto(string Category, decimal Amount);

public record RecentPaymentDto(
    int Id,
    string ApartmentNumber,
    string BlockName,
    decimal Amount,
    DateTime PaidAt
);

public record RecentIssueDto(
    int Id,
    string Title,
    string Status,
    string Priority,
    DateTime CreatedAt
);
