CREATE TABLE "dashboard_tabs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"owner_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sidebar_layouts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"layout" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widgets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"tab_id" uuid NOT NULL,
	"title" varchar(80) NOT NULL,
	"cypher" text,
	"visualization" varchar(40) DEFAULT 'TABLE' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"w" integer NOT NULL,
	"h" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard_tabs" ADD CONSTRAINT "dashboard_tabs_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sidebar_layouts" ADD CONSTRAINT "sidebar_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_tab_id_dashboard_tabs_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."dashboard_tabs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dashboard_tabs_dashboard_id_idx" ON "dashboard_tabs" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "dashboards_owner_id_idx" ON "dashboards" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "dashboards_connection_id_idx" ON "dashboards" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "widgets_dashboard_id_idx" ON "widgets" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "widgets_tab_id_idx" ON "widgets" USING btree ("tab_id");