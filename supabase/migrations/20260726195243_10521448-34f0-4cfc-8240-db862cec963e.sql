ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS dispatch_claimed_at timestamptz;

COMMENT ON COLUMN public.pedidos.dispatch_claimed_at IS
  'v278: trava de envio. Preenchido antes de chamar o fornecedor; liberado se o envio falhar. Reivindicável de novo após 3 min (worker morto).';

CREATE INDEX IF NOT EXISTS idx_pedidos_dispatch_claim
  ON public.pedidos (dispatch_claimed_at)
  WHERE provider_order_id IS NULL;