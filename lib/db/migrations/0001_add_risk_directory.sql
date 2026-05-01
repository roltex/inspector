CREATE TABLE IF NOT EXISTS "risk_level" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"tone" text DEFAULT 'muted' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_sector" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"risk_level_id" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_object" ADD COLUMN "risk_sector_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_level" ADD CONSTRAINT "risk_level_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_level" ADD CONSTRAINT "risk_level_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_sector" ADD CONSTRAINT "risk_sector_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_sector" ADD CONSTRAINT "risk_sector_risk_level_id_risk_level_id_fk" FOREIGN KEY ("risk_level_id") REFERENCES "public"."risk_level"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_sector" ADD CONSTRAINT "risk_sector_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_level_org_idx" ON "risk_level" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "risk_level_org_name_idx" ON "risk_level" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_sector_org_idx" ON "risk_sector" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "risk_sector_org_name_idx" ON "risk_sector" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_sector_level_idx" ON "risk_sector" USING btree ("risk_level_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_object" ADD CONSTRAINT "company_object_risk_sector_id_risk_sector_id_fk" FOREIGN KEY ("risk_sector_id") REFERENCES "public"."risk_sector"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_object_risk_sector_idx" ON "company_object" USING btree ("risk_sector_id");