ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

CREATE INDEX IF NOT EXISTS pedidos_utm_content_idx ON public.pedidos (utm_content) WHERE utm_content IS NOT NULL;
CREATE INDEX IF NOT EXISTS pedidos_utm_campaign_idx ON public.pedidos (utm_campaign) WHERE utm_campaign IS NOT NULL;