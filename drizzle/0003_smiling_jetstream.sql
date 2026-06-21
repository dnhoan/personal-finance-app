ALTER TYPE "public"."account_type" ADD VALUE 'receivable';--> statement-breakpoint
CREATE INDEX "transactions_goal_user_idx" ON "transactions" USING btree ("goal_id","user_id");