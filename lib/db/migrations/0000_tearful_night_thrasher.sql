CREATE TYPE "public"."incident_type" AS ENUM('INJURY', 'ILLNESS', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'SECURITY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."observation_type" AS ENUM('SAFE', 'UNSAFE_ACT', 'UNSAFE_CONDITION', 'NEAR_MISS', 'POSITIVE');--> statement-breakpoint
CREATE TYPE "public"."permit_status" AS ENUM('DRAFT', 'REQUESTED', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."permit_type" AS ENUM('HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL', 'EXCAVATION', 'LOCKOUT_TAGOUT', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('OWNER', 'ADMIN', 'EHS_MANAGER', 'SUPERVISOR', 'INSPECTOR', 'WORKER', 'CONTRACTOR', 'AUDITOR');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('INSPECTION', 'INCIDENT', 'OBSERVATION', 'RISK_ASSESSMENT', 'AUDIT', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'CLOSED', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."sub_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'paused');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "action" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"source_type" "source_type",
	"source_id" text,
	"priority" "severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "status" DEFAULT 'OPEN' NOT NULL,
	"assignee_id" text,
	"due_date" timestamp,
	"completed_at" timestamp,
	"evidence" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"data" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_id" text,
	"user_id" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"certificate_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chemical" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"cas_number" text,
	"manufacturer" text,
	"hazard_class" text,
	"ghs_pictograms" jsonb DEFAULT '[]'::jsonb,
	"signal_word" text,
	"sds_file_url" text,
	"location" text,
	"quantity" real,
	"unit" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_object" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"type" text,
	"address" text,
	"city" text,
	"country" text,
	"manager_name" text,
	"manager_email" text,
	"manager_phone" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contractor" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"rating" real,
	"insurance_expires_at" timestamp,
	"status" text DEFAULT 'active',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "department" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"site_id" text,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"current_version" integer DEFAULT 1 NOT NULL,
	"file_url" text,
	"mime_type" text,
	"requires_ack" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_ack" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" text NOT NULL,
	"user_id" text NOT NULL,
	"version" integer NOT NULL,
	"acked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finding" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inspection_id" text NOT NULL,
	"item_selection_id" text,
	"question_key" text,
	"description" text NOT NULL,
	"severity" "severity" DEFAULT 'LOW' NOT NULL,
	"values" jsonb,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incident" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"type" "incident_type" NOT NULL,
	"severity" "severity" DEFAULT 'LOW' NOT NULL,
	"status" "status" DEFAULT 'OPEN' NOT NULL,
	"description" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"reported_by_id" text,
	"site_id" text,
	"department_id" text,
	"injured_person_name" text,
	"body_part" text,
	"lost_time_days" integer DEFAULT 0,
	"root_cause" jsonb,
	"witnesses" jsonb,
	"photo_urls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspection" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text,
	"title" text NOT NULL,
	"status" "inspection_status" DEFAULT 'DRAFT' NOT NULL,
	"company_id" text,
	"object_id" text,
	"site_id" text,
	"scheduled_for" timestamp,
	"completed_at" timestamp,
	"assignee_id" text,
	"created_by_id" text,
	"score" real,
	"max_score" real,
	"answers" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspection_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" text,
	"category" text DEFAULT 'General' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspection_item_category" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspection_item_field" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inspection_item_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"options" jsonb,
	"sub_fields" jsonb,
	"preset_rows" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"placeholder" text,
	"help_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspection_item_selection" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inspection_id" text NOT NULL,
	"item_id" text,
	"label" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspection_item_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"description" text,
	"category_name" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_seed" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspection_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "role" DEFAULT 'WORKER' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"inviter_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpi_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"trir" real,
	"ltifr" real,
	"open_capa_count" integer,
	"overdue_capa_count" integer,
	"inspections_completed" integer,
	"observations_logged" integer,
	"incidents_reported" integer,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "role" DEFAULT 'WORKER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "observation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" "observation_type" NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"severity" "severity" DEFAULT 'LOW',
	"site_id" text,
	"photo_url" text,
	"reported_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"plan" "plan" DEFAULT 'FREE' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" "sub_status",
	"trial_ends_at" timestamp,
	"current_period_end" timestamp,
	"suspended_at" timestamp,
	"suspended_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permit" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" "permit_type" NOT NULL,
	"title" text NOT NULL,
	"status" "permit_status" DEFAULT 'DRAFT' NOT NULL,
	"site_id" text,
	"location" text,
	"work_description" text,
	"applicant_id" text,
	"approver_id" text,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"approved_at" timestamp,
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_definition" (
	"id" "plan" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"price_monthly" integer,
	"price_yearly" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"user_limit" integer DEFAULT 5 NOT NULL,
	"storage_limit_gb" integer DEFAULT 1 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cta" text,
	"popular" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ppe_issuance" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ppe_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"returned_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ppe_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 0,
	"unit" text DEFAULT 'pcs',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regulation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text,
	"title" text NOT NULL,
	"jurisdiction" text,
	"category" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"regulation_id" text,
	"title" text NOT NULL,
	"status" "status" DEFAULT 'OPEN' NOT NULL,
	"owner_id" text,
	"due_date" timestamp,
	"evidence_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"activity" text,
	"site_id" text,
	"assessor_id" text,
	"review_date" timestamp,
	"hazards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" text,
	"impersonated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"country" text,
	"timezone" text DEFAULT 'UTC',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_program" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_hours" real,
	"validity_months" integer,
	"mandatory" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"super_admin" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp,
	"ban_reason" text,
	"locale" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action" ADD CONSTRAINT "action_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action" ADD CONSTRAINT "action_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action" ADD CONSTRAINT "action_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_setting" ADD CONSTRAINT "app_setting_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certification" ADD CONSTRAINT "certification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certification" ADD CONSTRAINT "certification_program_id_training_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."training_program"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certification" ADD CONSTRAINT "certification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chemical" ADD CONSTRAINT "chemical_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company" ADD CONSTRAINT "company_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company" ADD CONSTRAINT "company_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_object" ADD CONSTRAINT "company_object_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_object" ADD CONSTRAINT "company_object_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_object" ADD CONSTRAINT "company_object_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contractor" ADD CONSTRAINT "contractor_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "department" ADD CONSTRAINT "department_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document" ADD CONSTRAINT "document_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document" ADD CONSTRAINT "document_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_ack" ADD CONSTRAINT "document_ack_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_ack" ADD CONSTRAINT "document_ack_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_ack" ADD CONSTRAINT "document_ack_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finding" ADD CONSTRAINT "finding_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finding" ADD CONSTRAINT "finding_inspection_id_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspection"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finding" ADD CONSTRAINT "finding_item_selection_id_inspection_item_selection_id_fk" FOREIGN KEY ("item_selection_id") REFERENCES "public"."inspection_item_selection"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incident" ADD CONSTRAINT "incident_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incident" ADD CONSTRAINT "incident_reported_by_id_user_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incident" ADD CONSTRAINT "incident_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incident" ADD CONSTRAINT "incident_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection" ADD CONSTRAINT "inspection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection" ADD CONSTRAINT "inspection_template_id_inspection_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."inspection_template"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection" ADD CONSTRAINT "inspection_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection" ADD CONSTRAINT "inspection_object_id_company_object_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."company_object"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection" ADD CONSTRAINT "inspection_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection" ADD CONSTRAINT "inspection_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection" ADD CONSTRAINT "inspection_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item" ADD CONSTRAINT "inspection_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item" ADD CONSTRAINT "inspection_item_category_id_inspection_item_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inspection_item_category"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item" ADD CONSTRAINT "inspection_item_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_category" ADD CONSTRAINT "inspection_item_category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_category" ADD CONSTRAINT "inspection_item_category_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_field" ADD CONSTRAINT "inspection_item_field_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_field" ADD CONSTRAINT "inspection_item_field_inspection_item_id_inspection_item_id_fk" FOREIGN KEY ("inspection_item_id") REFERENCES "public"."inspection_item"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_field" ADD CONSTRAINT "inspection_item_field_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_selection" ADD CONSTRAINT "inspection_item_selection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_selection" ADD CONSTRAINT "inspection_item_selection_inspection_id_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspection"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_selection" ADD CONSTRAINT "inspection_item_selection_item_id_inspection_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspection_item"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_template" ADD CONSTRAINT "inspection_item_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_template" ADD CONSTRAINT "inspection_item_template_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_template" ADD CONSTRAINT "inspection_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_template" ADD CONSTRAINT "inspection_template_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_snapshot" ADD CONSTRAINT "kpi_snapshot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "observation" ADD CONSTRAINT "observation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "observation" ADD CONSTRAINT "observation_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "observation" ADD CONSTRAINT "observation_reported_by_id_user_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permit" ADD CONSTRAINT "permit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permit" ADD CONSTRAINT "permit_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permit" ADD CONSTRAINT "permit_applicant_id_user_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permit" ADD CONSTRAINT "permit_approver_id_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_definition" ADD CONSTRAINT "plan_definition_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppe_issuance" ADD CONSTRAINT "ppe_issuance_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppe_issuance" ADD CONSTRAINT "ppe_issuance_ppe_item_id_ppe_item_id_fk" FOREIGN KEY ("ppe_item_id") REFERENCES "public"."ppe_item"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppe_issuance" ADD CONSTRAINT "ppe_issuance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ppe_item" ADD CONSTRAINT "ppe_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regulation" ADD CONSTRAINT "regulation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requirement" ADD CONSTRAINT "requirement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requirement" ADD CONSTRAINT "requirement_regulation_id_regulation_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requirement" ADD CONSTRAINT "requirement_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_assessor_id_user_id_fk" FOREIGN KEY ("assessor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "site" ADD CONSTRAINT "site_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_program" ADD CONSTRAINT "training_program_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_org_idx" ON "action" USING btree ("organization_id","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_assignee_idx" ON "action" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_org_idx" ON "audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cert_org_idx" ON "certification" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cert_user_idx" ON "certification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chem_org_idx" ON "chemical" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_org_idx" ON "company" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_org_name_idx" ON "company" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_object_org_idx" ON "company_object" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_object_company_idx" ON "company_object" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contractor_org_idx" ON "contractor" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "department_org_idx" ON "department" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_org_idx" ON "document" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "doc_ack_unique" ON "document_ack" USING btree ("document_id","user_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_insp_idx" ON "finding" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_item_selection_idx" ON "finding" USING btree ("item_selection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_org_idx" ON "incident" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_org_idx" ON "inspection" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_status_idx" ON "inspection" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_org_idx" ON "inspection_item" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_org_category_idx" ON "inspection_item" USING btree ("organization_id","category","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_org_category_id_idx" ON "inspection_item" USING btree ("organization_id","category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_category_org_idx" ON "inspection_item_category" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inspection_item_category_org_name_idx" ON "inspection_item_category" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_field_item_idx" ON "inspection_item_field" USING btree ("inspection_item_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inspection_item_field_item_key_idx" ON "inspection_item_field" USING btree ("inspection_item_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_sel_insp_idx" ON "inspection_item_selection" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_template_org_idx" ON "inspection_item_template" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_template_auto_seed_idx" ON "inspection_item_template" USING btree ("auto_seed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insp_tpl_org_idx" ON "inspection_template" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_org_email_idx" ON "invitation" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kpi_org_date_idx" ON "kpi_snapshot" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_org_user_idx" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_org_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "obs_org_idx" ON "observation" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_idx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "permit_org_idx" ON "permit" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ppe_iss_org_idx" ON "ppe_issuance" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ppe_org_idx" ON "ppe_item" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reg_org_idx" ON "regulation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "req_org_idx" ON "requirement" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_org_idx" ON "risk_assessment" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_org_idx" ON "site" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tp_org_idx" ON "training_program" USING btree ("organization_id");