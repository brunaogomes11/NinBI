CREATE TYPE "public"."schema_element_kind" AS ENUM('LABEL', 'RELATIONSHIP');--> statement-breakpoint
CREATE TYPE "public"."schema_status" AS ENUM('NEVER', 'READING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TABLE "connection_schemas" (
	"connection_id" uuid PRIMARY KEY NOT NULL,
	"read_at" timestamp with time zone NOT NULL,
	"document" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"uri" text NOT NULL,
	"database" varchar(120),
	"username" varchar(120) NOT NULL,
	"password_encrypted" text NOT NULL,
	"schema_status" "schema_status" DEFAULT 'NEVER' NOT NULL,
	"schema_read_started_at" timestamp with time zone,
	"schema_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schema_example_opt_outs" (
	"connection_id" uuid NOT NULL,
	"element_kind" "schema_element_kind" NOT NULL,
	"element_name" text NOT NULL,
	"property_name" text NOT NULL,
	CONSTRAINT "schema_example_opt_outs_connection_id_element_kind_element_name_property_name_pk" PRIMARY KEY("connection_id","element_kind","element_name","property_name")
);
--> statement-breakpoint
ALTER TABLE "connection_schemas" ADD CONSTRAINT "connection_schemas_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_example_opt_outs" ADD CONSTRAINT "schema_example_opt_outs_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connections_name_lower_uq" ON "connections" USING btree (lower("name"));