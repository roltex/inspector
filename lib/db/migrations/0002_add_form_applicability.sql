CREATE TABLE IF NOT EXISTS "inspection_item_applicability" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inspection_item_id" text NOT NULL,
	"risk_sector_id" text NOT NULL,
	"risk_level_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "risk_sector" DROP CONSTRAINT IF EXISTS "risk_sector_risk_level_id_risk_level_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "risk_sector_level_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_applicability" ADD CONSTRAINT "inspection_item_applicability_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_applicability" ADD CONSTRAINT "inspection_item_applicability_inspection_item_id_inspection_item_id_fk" FOREIGN KEY ("inspection_item_id") REFERENCES "public"."inspection_item"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_applicability" ADD CONSTRAINT "inspection_item_applicability_risk_sector_id_risk_sector_id_fk" FOREIGN KEY ("risk_sector_id") REFERENCES "public"."risk_sector"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspection_item_applicability" ADD CONSTRAINT "inspection_item_applicability_risk_level_id_risk_level_id_fk" FOREIGN KEY ("risk_level_id") REFERENCES "public"."risk_level"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_applicability_org_idx" ON "inspection_item_applicability" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_applicability_item_idx" ON "inspection_item_applicability" USING btree ("inspection_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_applicability_sector_idx" ON "inspection_item_applicability" USING btree ("risk_sector_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_item_applicability_level_idx" ON "inspection_item_applicability" USING btree ("risk_level_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inspection_item_applicability_unique_triple" ON "inspection_item_applicability" USING btree ("inspection_item_id","risk_sector_id","risk_level_id");--> statement-breakpoint
ALTER TABLE "risk_sector" DROP COLUMN IF EXISTS "risk_level_id";