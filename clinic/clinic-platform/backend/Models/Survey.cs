namespace ClinicPlatform.Api.Models;

public static class SurveyQuestionTypes
{
    public const string Rating  = "rating";   // 1–5 stars
    public const string YesNo   = "yesno";    // boolean
    public const string Text    = "text";     // free text
    public const string Choice  = "choice";   // single choice from options

    public static readonly string[] All = { Rating, YesNo, Text, Choice };
}

public static class SurveyStatuses
{
    public const string Active   = "Active";
    public const string Inactive = "Inactive";
}

// ── Survey template ───────────────────────────────────────────────────────────
public class Survey
{
    public Guid     Id          { get; set; } = Guid.NewGuid();
    public Guid     ClinicId    { get; set; }
    public string   Title       { get; set; } = string.Empty;
    public string?  Description { get; set; }
    public string   Status      { get; set; } = SurveyStatuses.Active;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<SurveyQuestion> Questions { get; set; } = new();
    public List<SurveyResponse> Responses { get; set; } = new();

    // Navigation
    public Clinic? Clinic { get; set; }
}

// ── A question inside a survey ────────────────────────────────────────────────
public class SurveyQuestion
{
    public Guid    Id         { get; set; } = Guid.NewGuid();
    public Guid    SurveyId   { get; set; }
    public int     SortOrder  { get; set; }
    public string  Text       { get; set; } = string.Empty;
    public string  Type       { get; set; } = SurveyQuestionTypes.Rating;
    public string? Options    { get; set; }  // CSV for "choice" type, e.g. "Evet,Hayır,Belki"
    public bool    IsRequired { get; set; } = true;

    public Survey? Survey { get; set; }
    public List<SurveyAnswer> Answers { get; set; } = new();
}

// ── A submitted response (one per patient/form submission) ────────────────────
public class SurveyResponse
{
    public Guid     Id          { get; set; } = Guid.NewGuid();
    public Guid     SurveyId    { get; set; }
    public Guid?    PatientId   { get; set; }
    public string?  PatientName { get; set; }  // denormalised for anonymous
    public string?  Email       { get; set; }
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;

    public Survey?  Survey      { get; set; }
    public Patient? Patient     { get; set; }
    public List<SurveyAnswer> Answers { get; set; } = new();
}

// ── One answer per question inside a response ─────────────────────────────────
public class SurveyAnswer
{
    public Guid    Id         { get; set; } = Guid.NewGuid();
    public Guid    ResponseId { get; set; }
    public Guid    QuestionId { get; set; }
    public string? Value      { get; set; }  // stored as string for all types

    public SurveyResponse?  Response { get; set; }
    public SurveyQuestion?  Question { get; set; }
}
