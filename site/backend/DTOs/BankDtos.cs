namespace SitePlatform.Api.DTOs;

public record BankDto(
    int Id,
    string BankName,
    string AccountName,
    string Iban,
    string? Branch,
    string? AccountNo,
    bool IsDefault,
    DateTime CreatedAt
);

public record CreateBankRequest(
    string BankName,
    string AccountName,
    string Iban,
    string? Branch,
    string? AccountNo,
    bool IsDefault
);

public record UpdateBankRequest(
    string BankName,
    string AccountName,
    string Iban,
    string? Branch,
    string? AccountNo,
    bool IsDefault
);
