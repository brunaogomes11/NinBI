CREATE TABLE "mcp_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"endpoint" text NOT NULL,
	"enabled_tools" jsonb DEFAULT '[]'::jsonb NOT NULL
);
