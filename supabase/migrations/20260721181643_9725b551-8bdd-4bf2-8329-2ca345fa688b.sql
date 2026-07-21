
ALTER TABLE public.pricing_items 
  ADD COLUMN IF NOT EXISTS smmhype_auto_id TEXT,
  ADD COLUMN IF NOT EXISTS smmpanel_auto_id TEXT,
  ADD COLUMN IF NOT EXISTS verified_auto_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pricing_items_auto_resolved ON public.pricing_items(auto_resolved_at);
