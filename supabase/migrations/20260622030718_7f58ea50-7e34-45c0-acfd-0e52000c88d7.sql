
-- Preserve existing pedidos data by renaming
ALTER TABLE public.pedidos RENAME TO pedidos_legacy;

-- New pedidos table per spec
CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  instagram_user text NOT NULL,
  pacote text NOT NULL,
  quantidade integer NOT NULL,
  valor double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mercado_pago_id text
);

GRANT INSERT ON public.pedidos TO anon, authenticated;
GRANT ALL ON public.pedidos TO service_role;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Public can create orders (checkout); validated server-side
CREATE POLICY "Anyone can create pedido" ON public.pedidos
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(instagram_user) BETWEEN 1 AND 200
    AND char_length(pacote) BETWEEN 1 AND 50
    AND quantidade > 0
    AND valor >= 0
    AND status = 'pending'
  );

-- No public reads on pedidos (PII protection); admin/service_role only
CREATE POLICY "Deny public reads on pedidos" ON public.pedidos
  FOR SELECT TO anon, authenticated USING (false);
