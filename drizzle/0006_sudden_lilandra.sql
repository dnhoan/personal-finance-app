CREATE TYPE "public"."transaction_review_status" AS ENUM('pending', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('manual', 'bank_sync');--> statement-breakpoint
CREATE TABLE "bank_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"gateway" text NOT NULL,
	"account_number" text NOT NULL,
	"last_bank_balance" numeric(18, 0),
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"sepay_id" text NOT NULL,
	"bank_link_id" uuid,
	"transaction_id" uuid,
	"status" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_sync_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source" "transaction_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "review_status" "transaction_review_status" DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_links" ADD CONSTRAINT "bank_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_links" ADD CONSTRAINT "bank_links_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_sync_events" ADD CONSTRAINT "bank_sync_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_sync_events" ADD CONSTRAINT "bank_sync_events_bank_link_id_bank_links_id_fk" FOREIGN KEY ("bank_link_id") REFERENCES "public"."bank_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_sync_events" ADD CONSTRAINT "bank_sync_events_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_sync_tokens" ADD CONSTRAINT "bank_sync_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_links_user_gateway_number_uniq" ON "bank_links" USING btree ("user_id","gateway","account_number");--> statement-breakpoint
CREATE INDEX "bank_links_user_idx" ON "bank_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_sync_events_user_sepay_id_uniq" ON "bank_sync_events" USING btree ("user_id","sepay_id");--> statement-breakpoint
CREATE INDEX "bank_sync_events_user_status_idx" ON "bank_sync_events" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "bank_sync_events_transaction_idx" ON "bank_sync_events" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_sync_tokens_hash_uniq" ON "bank_sync_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_sync_tokens_user_active_uniq" ON "bank_sync_tokens" USING btree ("user_id") WHERE revoked_at is null;