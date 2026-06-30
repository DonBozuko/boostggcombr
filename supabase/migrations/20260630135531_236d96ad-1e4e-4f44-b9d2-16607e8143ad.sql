
ALTER TABLE public.admin_treasury
  ADD COLUMN IF NOT EXISTS supplier_cost NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS provider_selected TEXT,
  ADD COLUMN IF NOT EXISTS net_profit_percentage NUMERIC(6,2);
