ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_pedidos_sla_deadline ON public.pedidos (sla_deadline) WHERE sla_deadline IS NOT NULL;