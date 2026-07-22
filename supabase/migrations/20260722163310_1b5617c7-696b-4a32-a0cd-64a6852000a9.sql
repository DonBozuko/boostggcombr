
ALTER TABLE public.pricing_items
  ADD COLUMN IF NOT EXISTS is_sellable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sellable_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_dry_run TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pricing_items_sellable_idx ON public.pricing_items(is_sellable);
