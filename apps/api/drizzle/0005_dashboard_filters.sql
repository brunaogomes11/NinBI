ALTER TABLE "dashboards" ADD COLUMN "filters" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboards" ADD COLUMN "refresh_interval_sec" integer DEFAULT 0 NOT NULL;