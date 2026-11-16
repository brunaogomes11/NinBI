CREATE TYPE "public"."llm_provider" AS ENUM('OPENAI', 'ANTHROPIC', 'GOOGLE', 'OLLAMA', 'OPENAI_COMPATIBLE');--> statement-breakpoint
CREATE TABLE "llm_settings" (
	"id" smallint PRIMARY KEY NOT NULL,
	"provider" "llm_provider" NOT NULL,
	"model" varchar(200) NOT NULL,
	"base_url" text,
	"api_key_encrypted" text,
	"api_key_last4" varchar(4),
	"updated_by" uuid,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "llm_settings_single_row" CHECK ("llm_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "llm_settings" ADD CONSTRAINT "llm_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;