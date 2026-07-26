ALTER TABLE public.pricing_items
  ADD COLUMN IF NOT EXISTS id_miss_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS id_miss_since timestamptz,
  ADD COLUMN IF NOT EXISTS last_cost_source text;