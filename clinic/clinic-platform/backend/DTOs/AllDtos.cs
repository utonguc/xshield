namespace ClinicPlatform.Api.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public int? TrialDaysLeft { get; set; }
}

public class MeResponse
{
    public string UserId { get; set; } = string.Empty;
    public string ClinicId { get; set; } = string.Empty;
    public string ClinicName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Role { get; set; }
    public List<string> ActiveModules { get; set; } = new();
    public string? ProfilePhotoUrl { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    public string  FullName { get; set; } = string.Empty;
    public string? Email    { get; set; }
}

// ── Patient / CRM ─────────────────────────────────────────────────────────────

public class CreatePatientRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? InterestedProcedure { get; set; }
    public string? LeadSource { get; set; }
    public string? AssignedConsultant { get; set; }
    public string? LeadStatus { get; set; }
    public string? Notes { get; set; }
}

public class UpdatePatientRequest : CreatePatientRequest { }

public class UpdateLeadStatusRequest
{
    public string LeadStatus { get; set; } = string.Empty;
}

public class PatientResponse
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? InterestedProcedure { get; set; }
    public string? LeadSource { get; set; }
    public string? AssignedConsultant { get; set; }
    public string LeadStatus { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

// ── Doctor ────────────────────────────────────────────────────────────────────

public class CreateDoctorRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Biography { get; set; }
    public string? Specializations { get; set; }
    public int? ExperienceYears { get; set; }
    public string? Certificates { get; set; }
}

public class UpdateDoctorRequest : CreateDoctorRequest
{
    public bool IsActive { get; set; } = true;
}

public class DoctorResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Biography { get; set; }
    public string? Specializations { get; set; }
    public int? ExperienceYears { get; set; }
    public string? Certificates { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

// ── Appointment ───────────────────────────────────────────────────────────────

public class CreateAppointmentRequest
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string ProcedureName { get; set; } = string.Empty;
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public string? Notes { get; set; }
}

public class UpdateAppointmentRequest : CreateAppointmentRequest { }

public class UpdateAppointmentStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class AppointmentResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientFullName { get; set; } = string.Empty;
    public Guid DoctorId { get; set; }
    public string DoctorFullName { get; set; } = string.Empty;
    public string ProcedureName { get; set; } = string.Empty;
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

// ── User Management ───────────────────────────────────────────────────────────

public class CreateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
}

public class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
    public bool IsActive { get; set; }
}

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}

public class UserListItemResponse
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
}

public class RoleListItemResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

// ── Organization Settings ─────────────────────────────────────────────────────

public class OrganizationSettingsResponse
{
    public Guid Id { get; set; }
    public Guid ClinicId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string ApplicationTitle { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string PrimaryColor { get; set; } = "#1d4ed8";
}

public class UpdateOrganizationSettingsRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string ApplicationTitle { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string PrimaryColor { get; set; } = "#1d4ed8";
}

// ── Dashboard Widget ──────────────────────────────────────────────────────────

public class DashboardWidgetResponse
{
    public Guid Id { get; set; }
    public string WidgetType { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Size { get; set; } = "medium";
    public string? Config { get; set; }
}

public class SaveDashboardRequest
{
    public List<WidgetItem> Widgets { get; set; } = new();

    public class WidgetItem
    {
        public string WidgetType { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public string Size { get; set; } = "medium";
        public string? Config { get; set; }
    }
}

// ── Scheduled Report ──────────────────────────────────────────────────────────

public class CreateScheduledReportRequest
{
    public string Name { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string? RecipientEmails { get; set; }
}

public class ScheduledReportResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public string ReportTypeLabel { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string? RecipientEmails { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastSentAtUtc { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

// ── Module License ────────────────────────────────────────────────────────────

public class ModuleLicenseResponse
{
    public string ModuleCode { get; set; } = string.Empty;
    public string ModuleLabel { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
}

public class ToggleModuleRequest
{
    public Guid ClinicId { get; set; }
    public string ModuleCode { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
}

// ── SuperAdmin: Clinic Management ─────────────────────────────────────────────

public class CreateClinicRequest
{
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Country { get; set; }
    /// <summary>Personel e-posta domain'i. Ör: "klinik-a.com.tr". Boş bırakılabilir, sonradan güncellenir.</summary>
    public string? EmailDomain { get; set; }
    public string AdminFullName { get; set; } = string.Empty;
    public string AdminUserName { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminPassword { get; set; } = string.Empty;
    public List<string> InitialModules { get; set; } = new();
}

public class UpdateClinicRequest
{
    public string  Name        { get; set; } = string.Empty;
    public string? City        { get; set; }
    public string? Country     { get; set; }
    public bool    IsActive    { get; set; } = true;
    /// <summary>Personel e-posta domain'i. Ör: "klinik-a.com.tr"</summary>
    public string? EmailDomain { get; set; }
}

public class ClinicListItemResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? EmailDomain { get; set; }
    public bool IsActive { get; set; }
    public int UserCount { get; set; }
    public int PatientCount { get; set; }
    public List<string> ActiveModules { get; set; } = new();
    public DateTime CreatedAtUtc { get; set; }
}

// ── Asset / Demirbaş ─────────────────────────────────────────────────────────

public class CreateAssetRequest
{
    public string   Name          { get; set; } = string.Empty;
    public string?  Category      { get; set; }
    public string?  Brand         { get; set; }
    public string?  Model         { get; set; }
    public string?  SerialNo      { get; set; }
    public string   Status        { get; set; } = "Active";
    public string?  Location      { get; set; }
    public decimal? PurchasePrice { get; set; }
    public DateTime? PurchasedAt  { get; set; }
    public DateTime? WarrantyUntil { get; set; }
    public DateTime? NextMaintenanceAt { get; set; }
    public string?  Notes         { get; set; }
}

public class UpdateAssetRequest : CreateAssetRequest { }

public class AssetResponse
{
    public Guid    Id          { get; set; }
    public string  Name        { get; set; } = string.Empty;
    public string? Category    { get; set; }
    public string? Brand       { get; set; }
    public string? Model       { get; set; }
    public string? SerialNo    { get; set; }
    public string  Status      { get; set; } = string.Empty;
    public string? Location    { get; set; }
    public decimal? PurchasePrice { get; set; }
    public DateTime? PurchasedAt { get; set; }
    public DateTime? WarrantyUntil { get; set; }
    public bool    WarrantyExpired { get; set; }
    public DateTime? NextMaintenanceAt { get; set; }
    public bool    MaintenanceDue { get; set; }
    public string? Notes       { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

// ── Stock / Inventory ─────────────────────────────────────────────────────────

public class CreateStockItemRequest
{
    public string  Name        { get; set; } = string.Empty;
    public string? Category    { get; set; }
    public string? Unit        { get; set; }
    public string? Barcode     { get; set; }
    public string? Supplier    { get; set; }
    public decimal UnitCost    { get; set; }
    public int     Quantity    { get; set; }
    public int     MinQuantity { get; set; } = 5;
    public DateTime? ExpiresAtUtc { get; set; }
}

public class UpdateStockItemRequest : CreateStockItemRequest { }

public class StockMovementRequest
{
    public string  Type     { get; set; } = "in";
    public int     Quantity { get; set; }
    public string? Note     { get; set; }
}

public class StockItemResponse
{
    public Guid    Id          { get; set; }
    public string  Name        { get; set; } = string.Empty;
    public string? Category    { get; set; }
    public string? Unit        { get; set; }
    public string? Barcode     { get; set; }
    public string? Supplier    { get; set; }
    public decimal UnitCost    { get; set; }
    public int     Quantity    { get; set; }
    public int     MinQuantity { get; set; }
    public bool    IsLow       { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool    IsExpired   { get; set; }
    public bool    ExpiresSoon { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class StockMovementResponse
{
    public Guid   Id       { get; set; }
    public string Type     { get; set; } = string.Empty;
    public int    Quantity { get; set; }
    public string? Note    { get; set; }
    public string? UserName { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

// ── Notifications ─────────────────────────────────────────────────────────────

public class NotificationResponse
{
    public Guid    Id          { get; set; }
    public string  Title       { get; set; } = string.Empty;
    public string  Message     { get; set; } = string.Empty;
    public string  Type        { get; set; } = string.Empty;
    public string? Link        { get; set; }
    public bool    IsRead      { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string  TimeAgo     { get; set; } = string.Empty;
}

public class CreateNotificationRequest
{
    public Guid    UserId  { get; set; }
    public string  Title   { get; set; } = string.Empty;
    public string  Message { get; set; } = string.Empty;
    public string  Type    { get; set; } = "info";
    public string? Link    { get; set; }
}

// ── Document Management ───────────────────────────────────────────────────────

public class DocumentResponse
{
    public Guid    Id             { get; set; }
    public string  OriginalName   { get; set; } = string.Empty;
    public string  Category       { get; set; } = string.Empty;
    public string? Description    { get; set; }
    public string  MimeType       { get; set; } = string.Empty;
    public long    FileSize        { get; set; }
    public Guid?   PatientId      { get; set; }
    public string? PatientName    { get; set; }
    public Guid?   UploadedById   { get; set; }
    public string? UploadedByName { get; set; }
    public DateTime CreatedAtUtc  { get; set; }
    public string  FileSizeLabel  { get; set; } = string.Empty;
}

// ── Doctor Schedule / Leave ───────────────────────────────────────────────────

public class DoctorScheduleItem
{
    public Guid?  Id           { get; set; }
    public int    DayOfWeek    { get; set; }
    public string StartTime    { get; set; } = "09:00";
    public string EndTime      { get; set; } = "17:00";
    public int    SlotMinutes  { get; set; } = 30;
    public bool   IsActive     { get; set; } = true;
}

public class SaveDoctorScheduleRequest
{
    public List<DoctorScheduleItem> Schedules { get; set; } = new();
}

public class DoctorLeaveRequest
{
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc   { get; set; }
    public string?  Reason     { get; set; }
}

public class DoctorLeaveResponse
{
    public Guid     Id         { get; set; }
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc   { get; set; }
    public string?  Reason     { get; set; }
    public string   DoctorName { get; set; } = string.Empty;
}

public class TimeSlotResponse
{
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc   { get; set; }
    public bool     Available { get; set; }
}

// ── AppointmentRequest ────────────────────────────────────────────────────────

public class SubmitAppointmentRequestDto
{
    public Guid    DoctorId         { get; set; }
    public DateTime RequestedStartUtc { get; set; }
    public DateTime RequestedEndUtc   { get; set; }
    public string  ProcedureName     { get; set; } = string.Empty;
    public string  PatientFirstName  { get; set; } = string.Empty;
    public string  PatientLastName   { get; set; } = string.Empty;
    public string? PatientPhone      { get; set; }
    public string? PatientEmail      { get; set; }
    public string? PatientNotes      { get; set; }
}

public class AppointmentRequestResponse
{
    public Guid     Id               { get; set; }
    public string   DoctorName       { get; set; } = string.Empty;
    public string   DoctorBranch     { get; set; } = string.Empty;
    public DateTime RequestedStartUtc { get; set; }
    public DateTime RequestedEndUtc   { get; set; }
    public string   ProcedureName    { get; set; } = string.Empty;
    public string   PatientFirstName { get; set; } = string.Empty;
    public string   PatientLastName  { get; set; } = string.Empty;
    public string?  PatientPhone     { get; set; }
    public string?  PatientEmail     { get; set; }
    public string?  PatientNotes     { get; set; }
    public string   Status           { get; set; } = string.Empty;
    public string?  RejectionReason  { get; set; }
    public DateTime CreatedAtUtc     { get; set; }
}

public class ReviewAppointmentRequestDto
{
    public string   Action           { get; set; } = "approve"; // approve | reject
    public string?  RejectionReason  { get; set; }
    // For approve: optionally override the appointment details
    public string?  ProcedureName    { get; set; }
    public DateTime? StartAtUtc      { get; set; }
    public DateTime? EndAtUtc        { get; set; }
}

// ── ClinicWebsite ─────────────────────────────────────────────────────────────

public class ClinicWebsiteResponse
{
    public Guid    Id             { get; set; }
    public string  Slug           { get; set; } = string.Empty;
    public string? CustomDomain   { get; set; }
    public bool    IsPublished    { get; set; }
    public string? HeroTitle      { get; set; }
    public string? HeroSubtitle   { get; set; }
    public string? HeroImageUrl   { get; set; }
    public string? AboutText      { get; set; }
    public string? Address        { get; set; }
    public string? Phone          { get; set; }
    public string? Email          { get; set; }
    public string? GoogleMapsUrl  { get; set; }
    public string? InstagramUrl   { get; set; }
    public string? FacebookUrl    { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string  PrimaryColor   { get; set; } = "#1d4ed8";
    public string  Theme          { get; set; } = "modern";
    public string? MetaTitle      { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords   { get; set; }
    public bool    ShowPrices        { get; set; }
    public bool    ShowReviews       { get; set; }
    public bool    BookingEnabled    { get; set; }
    public bool    ListedInDirectory { get; set; }
}

public class SaveClinicWebsiteRequest : ClinicWebsiteResponse { }

// ── Public API ────────────────────────────────────────────────────────────────

public class PublicClinicResponse
{
    public string  Name           { get; set; } = string.Empty;
    public string  Slug           { get; set; } = string.Empty;
    public string? HeroTitle      { get; set; }
    public string? HeroSubtitle   { get; set; }
    public string? HeroImageUrl   { get; set; }
    public string? AboutText      { get; set; }
    public string? Address        { get; set; }
    public string? Phone          { get; set; }
    public string? Email          { get; set; }
    public string? GoogleMapsUrl  { get; set; }
    public string? InstagramUrl   { get; set; }
    public string? FacebookUrl    { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string  PrimaryColor   { get; set; } = "#1d4ed8";
    public string  Theme          { get; set; } = "modern";
    public bool    ShowPrices     { get; set; }
    public bool    ShowReviews    { get; set; }
    public bool    BookingEnabled { get; set; }
    public List<PublicDoctorResponse> Doctors { get; set; } = new();
}

public class PublicDoctorResponse
{
    public Guid    Id              { get; set; }
    public string  FullName        { get; set; } = string.Empty;
    public string? Branch          { get; set; }
    public string? Biography       { get; set; }
    public string? PhotoUrl        { get; set; }
    public string? Specializations { get; set; }
    public int?    ExperienceYears { get; set; }
    public double? AvgRating       { get; set; }
    public int     ReviewCount     { get; set; }
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

public class WhatsAppSettingResponse
{
    public bool      IsActive      { get; set; }
    public string?   PhoneNumberId { get; set; }
    public string?   FromNumber    { get; set; }
    public bool      HasToken      { get; set; }
    public DateTime? UpdatedAtUtc  { get; set; }
}

public class SaveWhatsAppSettingRequest
{
    public bool    IsActive      { get; set; }
    public string? PhoneNumberId { get; set; }
    public string? FromNumber    { get; set; }
    public string? ApiToken      { get; set; }
}

public class SendWhatsAppRequest
{
    public string  ToNumber  { get; set; } = string.Empty;
    public string  Body      { get; set; } = string.Empty;
    public Guid?   PatientId { get; set; }
}

public class AppointmentReminderRequest
{
    public Guid AppointmentId { get; set; }
}

public class BulkWhatsAppRequest
{
    public string  Message             { get; set; } = string.Empty;
    public string? LeadStatus          { get; set; }
    public string? InterestedProcedure { get; set; }
    public List<Guid>? PatientIds      { get; set; }
}

public class WhatsAppLogResponse
{
    public Guid     Id          { get; set; }
    public string   ToNumber    { get; set; } = string.Empty;
    public string   MessageBody { get; set; } = string.Empty;
    public string   Status      { get; set; } = string.Empty;
    public string?  ErrorDetail { get; set; }
    public string?  PatientName { get; set; }
    public string?  SentByName  { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

// ── Survey / Anket ────────────────────────────────────────────────────────────

public class SurveyQuestionRequest
{
    public int     SortOrder  { get; set; }
    public string  Text       { get; set; } = string.Empty;
    public string  Type       { get; set; } = "rating";
    public string? Options    { get; set; }
    public bool    IsRequired { get; set; } = true;
}

public class CreateSurveyRequest
{
    public string  Title       { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<SurveyQuestionRequest> Questions { get; set; } = new();
}

public class UpdateSurveyRequest : CreateSurveyRequest
{
    public string Status { get; set; } = "Active";
}

public class SurveyQuestionResponse
{
    public Guid    Id         { get; set; }
    public int     SortOrder  { get; set; }
    public string  Text       { get; set; } = string.Empty;
    public string  Type       { get; set; } = string.Empty;
    public string? Options    { get; set; }
    public bool    IsRequired { get; set; }
}

public class SurveyListItemResponse
{
    public Guid     Id            { get; set; }
    public string   Title         { get; set; } = string.Empty;
    public string?  Description   { get; set; }
    public string   Status        { get; set; } = string.Empty;
    public int      QuestionCount { get; set; }
    public int      ResponseCount { get; set; }
    public double?  AvgRating     { get; set; }
    public DateTime CreatedAtUtc  { get; set; }
}

public class SurveyDetailResponse : SurveyListItemResponse
{
    public List<SurveyQuestionResponse> Questions { get; set; } = new();
}

public class SubmitSurveyAnswerRequest
{
    public Guid    QuestionId { get; set; }
    public string? Value      { get; set; }
}

public class SubmitSurveyRequest
{
    public Guid?   PatientId   { get; set; }
    public string? PatientName { get; set; }
    public string? Email       { get; set; }
    public List<SubmitSurveyAnswerRequest> Answers { get; set; } = new();
}

public class SurveyResponseListItem
{
    public Guid     Id             { get; set; }
    public string?  PatientName    { get; set; }
    public string?  Email          { get; set; }
    public double?  RatingAvg      { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public List<SurveyAnswerItem> Answers { get; set; } = new();
}

public class SurveyAnswerItem
{
    public string  QuestionText { get; set; } = string.Empty;
    public string  QuestionType { get; set; } = string.Empty;
    public string? Value        { get; set; }
}

public class SurveyStatsResponse
{
    public int    TotalResponses   { get; set; }
    public double? AvgRating       { get; set; }
    public int    Positive         { get; set; }  // rating >= 4
    public int    Neutral          { get; set; }  // rating == 3
    public int    Negative         { get; set; }  // rating <= 2
    public List<QuestionStatItem> QuestionStats { get; set; } = new();
}

public class QuestionStatItem
{
    public Guid   QuestionId   { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string QuestionType { get; set; } = string.Empty;
    public double? AvgValue    { get; set; }
    public Dictionary<string, int> ValueCounts { get; set; } = new();
}

// ── Task Management ───────────────────────────────────────────────────────────

public class CreateTaskRequest
{
    public string  Title       { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string  Priority    { get; set; } = "Medium";
    public Guid?   AssignedToId { get; set; }
    public DateTime? DueAtUtc  { get; set; }
}

public class UpdateTaskRequest : CreateTaskRequest
{
    public string Status { get; set; } = "Todo";
}

public class UpdateTaskStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class TaskResponse
{
    public Guid    Id            { get; set; }
    public string  Title         { get; set; } = string.Empty;
    public string? Description   { get; set; }
    public string  Status        { get; set; } = string.Empty;
    public string  Priority      { get; set; } = string.Empty;
    public Guid?   AssignedToId  { get; set; }
    public string? AssignedToName { get; set; }
    public Guid?   CreatedById   { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? DueAtUtc    { get; set; }
    public DateTime  CreatedAtUtc { get; set; }
    public bool      IsOverdue   { get; set; }
}

// ── Invoice / Finance ─────────────────────────────────────────────────────────

public class InvoiceItemRequest
{
    public string  Description { get; set; } = string.Empty;
    public int     Quantity    { get; set; } = 1;
    public decimal UnitPrice   { get; set; }
}

public class CreateInvoiceRequest
{
    public Guid   PatientId { get; set; }
    public Guid?  DoctorId  { get; set; }
    public DateTime IssuedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? DueAtUtc  { get; set; }
    public string  Currency   { get; set; } = "TRY";
    public decimal TaxRate    { get; set; }
    public string? Notes      { get; set; }
    public List<InvoiceItemRequest> Items { get; set; } = new();
}

public class UpdateInvoiceRequest : CreateInvoiceRequest { }

public class UpdateInvoiceStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class InvoiceItemResponse
{
    public Guid    Id          { get; set; }
    public string  Description { get; set; } = string.Empty;
    public int     Quantity    { get; set; }
    public decimal UnitPrice   { get; set; }
    public decimal LineTotal   { get; set; }
}

public class InvoiceResponse
{
    public Guid    Id           { get; set; }
    public string  InvoiceNo    { get; set; } = string.Empty;
    public Guid    PatientId    { get; set; }
    public string  PatientName  { get; set; } = string.Empty;
    public Guid?   DoctorId     { get; set; }
    public string? DoctorName   { get; set; }
    public DateTime IssuedAtUtc { get; set; }
    public DateTime? DueAtUtc   { get; set; }
    public string  Status       { get; set; } = string.Empty;
    public string  Currency     { get; set; } = "TRY";
    public decimal Subtotal     { get; set; }
    public decimal TaxRate      { get; set; }
    public decimal TaxAmount    { get; set; }
    public decimal Total        { get; set; }
    public string? Notes        { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public List<InvoiceItemResponse> Items { get; set; } = new();
}

// ── Shared ────────────────────────────────────────────────────────────────────

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)Total / PageSize) : 0;
}
