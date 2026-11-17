CREATE TYPE "public"."connection_type" AS ENUM('NEO4J', 'POSTGRES', 'MYSQL', 'SQLSERVER');--> statement-breakpoint
ALTER TYPE "public"."schema_element_kind" ADD VALUE 'TABLE';--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "uri" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "type" "connection_type" DEFAULT 'NEO4J' NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "host" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "port" integer;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "ssl" boolean DEFAULT false NOT NULL;