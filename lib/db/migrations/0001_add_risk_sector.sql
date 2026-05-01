CREATE TABLE IF NOT EXISTS "risk_sector" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"default_risk" "severity" DEFAULT 'MEDIUM' NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "risk_sector_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_sector" ADD CONSTRAINT "risk_sector_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "risk_sector_org_idx" ON "risk_sector" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "risk_sector_org_name_idx" ON "risk_sector" USING btree ("organization_id","name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company" ADD CONSTRAINT "company_risk_sector_id_risk_sector_id_fk" FOREIGN KEY ("risk_sector_id") REFERENCES "public"."risk_sector"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_risk_sector_idx" ON "company" USING btree ("risk_sector_id");