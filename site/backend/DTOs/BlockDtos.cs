namespace SitePlatform.Api.DTOs;

public record BlockDto(int Id, string Name, int FloorCount, decimal DuesCoefficient, int ApartmentCount, DateTime CreatedAt);
public record CreateBlockRequest(string Name, int FloorCount, decimal DuesCoefficient = 0);
public record UpdateBlockRequest(string Name, int FloorCount, decimal DuesCoefficient = 0);
