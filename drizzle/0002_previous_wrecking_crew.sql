CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense');--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "kind" "category_kind" DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "archived_at" timestamp with time zone;