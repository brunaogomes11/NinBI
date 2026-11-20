ALTER TABLE "dashboards" ALTER COLUMN "connection_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "mcp_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "mcp_call" jsonb;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_mcp_connection_id_mcp_connections_id_fk" FOREIGN KEY ("mcp_connection_id") REFERENCES "public"."mcp_connections"("id") ON DELETE restrict ON UPDATE no action;