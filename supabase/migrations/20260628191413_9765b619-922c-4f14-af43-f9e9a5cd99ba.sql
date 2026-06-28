ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS utm_source TEXT;
CREATE INDEX IF NOT EXISTS idx_pedidos_utm_source ON public.pedidos(utm_source) WHERE utm_source IS NOT NULL;