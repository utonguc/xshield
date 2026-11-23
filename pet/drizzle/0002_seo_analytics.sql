CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "ga_measurement_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "gsc_verification" text;