using SitePlatform.Api.Models;

namespace SitePlatform.Api.DTOs;

// ─── Karar Defteri ───
public record DecisionDto(
    int Id, int Number, string Title, string Content,
    DateOnly DecisionDate, string Result, int? MeetingId, DateTime CreatedAt
);
public record CreateDecisionRequest(
    string Title, string Content, DateOnly DecisionDate, DecisionResult Result, int? MeetingId
);

// ─── Anketler ───
public record SurveyOptionDto(int Id, string Text, int VoteCount, double Percent);
public record SurveyDto(
    int Id, string Question, string? Description, bool IsClosed, DateTime? EndsAt,
    int TotalVotes, int? MyVoteOptionId, List<SurveyOptionDto> Options, DateTime CreatedAt
);
public record CreateSurveyRequest(string Question, string? Description, DateTime? EndsAt, List<string> Options);
public record CastSurveyVoteRequest(int OptionId);
