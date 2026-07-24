ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS refill_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS refill_result text,
  ADD COLUMN IF NOT EXISTS drop_checked_at timestamptz;