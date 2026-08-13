using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

public record ExpenseDto(
    int Id,
    string Title,
    decimal Amount,
    string Category,
    string? Description,
    DateTime ExpenseDate,
    string? ReceiptNo,
    int CreatedById,
    DateTime CreatedAt
);

public record CreateExpenseRequest(
    string Title,
    decimal Amount,
    ExpenseCategory Category,
    string? Description,
    DateTime ExpenseDate,
    string? ReceiptNo
);

public record KasaDto(
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Balance,
    decimal ThisMonthIncome,
    decimal ThisMonthExpense,
    List<KasaTransactionDto> Transactions
);

public record KasaTransactionDto(
    int Id,
    string Type,       // "income" | "expense"
    string Title,
    decimal Amount,
    string Category,
    DateTime Date,
    string? Description,
    string? ReceiptNo
);
