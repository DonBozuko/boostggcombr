
CREATE TABLE public.admin_treasury (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  faturamento NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_api NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxa_pix NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  network TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_treasury_occurred_at ON public.admin_treasury(occurred_at DESC);
CREATE UNIQUE INDEX idx_admin_treasury_pedido ON public.admin_treasury(pedido_id) WHERE pedido_id IS NOT NULL;

GRANT SELECT ON public.admin_treasury TO authenticated;
GRANT ALL ON public.admin_treasury TO service_role;

ALTER TABLE public.admin_treasury ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'fabiano.majestic@gmail.com'
  );
$$;

CREATE POLICY "Director reads treasury"
  ON public.admin_treasury FOR SELECT TO authenticated
  USING (public.is_director());
