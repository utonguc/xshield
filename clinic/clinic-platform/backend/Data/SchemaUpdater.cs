using Microsoft.EntityFrameworkCore;

namespace ClinicPlatform.Api.Data;

/// <summary>
/// Runs after EnsureCreated to add any tables that were added to the model
/// after the initial database creation. This prevents having to wipe the
/// database (and losing data) every time a new entity is introduced.
///
/// Add a new "-- TABLE: TableName" block here whenever a new entity is added to AppDbContext.
/// </summary>
public static class SchemaUpdater
{
    public static void ApplyMissingTables(AppDbContext db, ILogger logger)
    {
        try
        {
            db.Database.ExecuteSqlRaw(Sql);
            logger.LogInformation("SchemaUpdater: missing tables check completed.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SchemaUpdater failed.");
        }
    }

    // Language: PostgreSQL
    // Each block is idempotent (CREATE TABLE IF NOT EXISTS).
    // Only add tables here that were added AFTER the initial EnsureCreated run.
    private const string Sql = """

        -- TABLE: DoctorSchedules
        CREATE TABLE IF NOT EXISTS "DoctorSchedules" (
            "Id"          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            "DoctorId"    uuid        NOT NULL,
            "ClinicId"    uuid        NOT NULL,
            "DayOfWeek"   integer     NOT NULL,
            "StartTime"   interval    NOT NULL,
            "EndTime"     interval    NOT NULL,
            "SlotMinutes" integer     NOT NULL DEFAULT 30,
            "IsActive"    boolean     NOT NULL DEFAULT true,
            CONSTRAINT fk_doctorschedules_doctor
                FOREIGN KEY ("DoctorId") REFERENCES "Doctors"("Id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS ix_doctorschedules_doctor ON "DoctorSchedules"("DoctorId");

        -- TABLE: DoctorLeaves
        CREATE TABLE IF NOT EXISTS "DoctorLeaves" (
            "Id"          uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            "DoctorId"    uuid         NOT NULL,
            "ClinicId"    uuid         NOT NULL,
            "StartAtUtc"  timestamptz  NOT NULL,
            "EndAtUtc"    timestamptz  NOT NULL,
            "Reason"      text,
            CONSTRAINT fk_doctorleaves_doctor
                FOREIGN KEY ("DoctorId") REFERENCES "Doctors"("Id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS ix_doctorleaves_doctor ON "DoctorLeaves"("DoctorId");

        -- TABLE: AppointmentRequests
        CREATE TABLE IF NOT EXISTS "AppointmentRequests" (
            "Id"                    uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            "ClinicId"              uuid         NOT NULL,
            "DoctorId"              uuid         NOT NULL,
            "RequestedStartUtc"     timestamptz  NOT NULL,
            "RequestedEndUtc"       timestamptz  NOT NULL,
            "ProcedureName"         text         NOT NULL,
            "PatientFirstName"      text         NOT NULL,
            "PatientLastName"       text         NOT NULL,
            "PatientPhone"          text,
            "PatientEmail"          text,
            "PatientNotes"          text,
            "Status"                text         NOT NULL DEFAULT 'Pending',
            "RejectionReason"       text,
            "ReviewedByUserId"      uuid,
            "ReviewedAtUtc"         timestamptz,
            "CreatedAppointmentId"  uuid,
            "CreatedAtUtc"          timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT fk_apptreq_doctor
                FOREIGN KEY ("DoctorId") REFERENCES "Doctors"("Id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS ix_apptreq_clinic    ON "AppointmentRequests"("ClinicId");
        CREATE INDEX IF NOT EXISTS ix_apptreq_status    ON "AppointmentRequests"("Status");

        -- TABLE: ClinicWebsites
        CREATE TABLE IF NOT EXISTS "ClinicWebsites" (
            "Id"              uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            "ClinicId"        uuid         NOT NULL UNIQUE,
            "Slug"            text         NOT NULL UNIQUE,
            "CustomDomain"    text,
            "IsPublished"     boolean      NOT NULL DEFAULT false,
            "HeroTitle"       text,
            "HeroSubtitle"    text,
            "HeroImageUrl"    text,
            "AboutText"       text,
            "Address"         text,
            "Phone"           text,
            "Email"           text,
            "GoogleMapsUrl"   text,
            "InstagramUrl"    text,
            "FacebookUrl"     text,
            "WhatsAppNumber"  text,
            "PrimaryColor"    text         NOT NULL DEFAULT '#1d4ed8',
            "Theme"           text         NOT NULL DEFAULT 'modern',
            "MetaTitle"       text,
            "MetaDescription" text,
            "MetaKeywords"    text,
            "ShowPrices"      boolean      NOT NULL DEFAULT false,
            "ShowReviews"     boolean      NOT NULL DEFAULT true,
            "BookingEnabled"  boolean      NOT NULL DEFAULT true,
            "UpdatedAtUtc"    timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT fk_clinicwebsite_clinic
                FOREIGN KEY ("ClinicId") REFERENCES "Clinics"("Id") ON DELETE CASCADE
        );

        -- TABLE: AuditLogs
        CREATE TABLE IF NOT EXISTS "AuditLogs" (
            "Id"           uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            "ClinicId"     uuid         NOT NULL,
            "UserId"       uuid,
            "EntityType"   varchar(100) NOT NULL,
            "EntityId"     varchar(100) NOT NULL,
            "Action"       varchar(50)  NOT NULL,
            "Description"  varchar(1000) NOT NULL,
            "ChangesJson"  text,
            "IpAddress"    varchar(50),
            "CreatedAtUtc" timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT fk_auditlog_user
                FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS ix_auditlogs_clinic      ON "AuditLogs"("ClinicId");
        CREATE INDEX IF NOT EXISTS ix_auditlogs_clinic_time ON "AuditLogs"("ClinicId", "CreatedAtUtc" DESC);
        CREATE INDEX IF NOT EXISTS ix_auditlogs_entity      ON "AuditLogs"("ClinicId", "EntityType");

        -- TABLE: PatientAccounts (hasta portalı login)
        CREATE TABLE IF NOT EXISTS "PatientAccounts" (
            "Id"           uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            "PatientId"    uuid         NOT NULL,
            "ClinicId"     uuid         NOT NULL,
            "Email"        varchar(200) NOT NULL,
            "PasswordHash" varchar(200) NOT NULL,
            "IsActive"     boolean      NOT NULL DEFAULT true,
            "CreatedAtUtc" timestamptz  NOT NULL DEFAULT now(),
            "LastLoginUtc" timestamptz,
            CONSTRAINT fk_patientaccount_patient
                FOREIGN KEY ("PatientId") REFERENCES "Patients"("Id") ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ix_patientaccounts_email_clinic ON "PatientAccounts"("Email", "ClinicId");
        CREATE INDEX IF NOT EXISTS ix_patientaccounts_patient ON "PatientAccounts"("PatientId");

        -- Add missing columns to existing tables (idempotent via DO block)
        DO $$
        BEGIN
            -- DedupeKey on Notifications (added for ClinicAlertWorker)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Notifications' AND column_name = 'DedupeKey'
            ) THEN
                ALTER TABLE "Notifications" ADD COLUMN "DedupeKey" varchar(200);
            END IF;

            -- AppointmentId + MessageType on WhatsAppLogs (added for reminder deduplication)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'WhatsAppLogs' AND column_name = 'AppointmentId'
            ) THEN
                ALTER TABLE "WhatsAppLogs" ADD COLUMN "AppointmentId" uuid;
                ALTER TABLE "WhatsAppLogs" ADD COLUMN "MessageType" varchar(50);
            END IF;
            -- ProfilePhotoUrl on Users (added for user profile photo feature)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Users' AND column_name = 'ProfilePhotoUrl'
            ) THEN
                ALTER TABLE "Users" ADD COLUMN "ProfilePhotoUrl" text;
            END IF;

            -- TrialEndsAtUtc + Plan on Clinics (added for demo/trial system)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Clinics' AND column_name = 'TrialEndsAtUtc'
            ) THEN
                ALTER TABLE "Clinics" ADD COLUMN "TrialEndsAtUtc" timestamptz;
                ALTER TABLE "Clinics" ADD COLUMN "Plan" varchar(50);
            END IF;

            -- ListedInDirectory on ClinicWebsites (opt-in directory listing)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'ClinicWebsites' AND column_name = 'ListedInDirectory'
            ) THEN
                ALTER TABLE "ClinicWebsites" ADD COLUMN "ListedInDirectory" boolean NOT NULL DEFAULT false;
            END IF;

            -- EmailDomain on Clinics (domain-based staff login, e.g. "klinik-a.com.tr")
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Clinics' AND column_name = 'EmailDomain'
            ) THEN
                ALTER TABLE "Clinics" ADD COLUMN "EmailDomain" varchar(200);
                CREATE UNIQUE INDEX IF NOT EXISTS ix_clinics_emaildomain
                    ON "Clinics"("EmailDomain") WHERE "EmailDomain" IS NOT NULL;
            END IF;

        END $$;

        CREATE INDEX IF NOT EXISTS ix_wa_logs_appointment ON "WhatsAppLogs"("AppointmentId", "MessageType")
            WHERE "AppointmentId" IS NOT NULL;

        CREATE INDEX IF NOT EXISTS ix_notifications_dedupe ON "Notifications"("ClinicId", "DedupeKey", "CreatedAtUtc" DESC)
            WHERE "DedupeKey" IS NOT NULL;

        """;
}
