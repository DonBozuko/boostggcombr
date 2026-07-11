ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS bump_offered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bump_accepted boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_pedidos_bump_analytics ON public.pedidos(created_at DESC) WHERE bump_offered = true;