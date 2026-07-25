ALTER TABLE public.pricing_items
  ADD COLUMN IF NOT EXISTS refill_supported BOOLEAN,
  ADD COLUMN IF NOT EXISTS refill_checked_at TIMESTAMPTZ;