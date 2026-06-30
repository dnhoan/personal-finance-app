ALTER TABLE "accounts" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_default_uniq" ON "accounts" USING btree ("user_id") WHERE "accounts"."is_default";--> statement-breakpoint
CREATE INDEX "categories_user_kind_order_idx" ON "categories" USING btree ("user_id","kind","sort_order");--> statement-breakpoint
-- Seed sort_order from the current alphabetical order, per user + kind + parent scope,
-- so existing categories keep a stable initial order matching today's name-sorted pickers.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, kind, COALESCE(parent_id::text, '')
    ORDER BY name
  ) AS rn
  FROM categories
)
UPDATE categories c SET sort_order = ranked.rn
FROM ranked WHERE ranked.id = c.id;