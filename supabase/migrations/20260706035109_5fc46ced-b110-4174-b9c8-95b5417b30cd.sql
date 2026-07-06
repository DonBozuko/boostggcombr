-- 1. Tabela de eventos de webhook (auditoria + idempotência forte)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  topic TEXT,
  raw_payload JSONB,
  client_ip TEXT,
  processed_ok BOOLEAN NOT NULL DEFAULT false,
  error_detail TEXT,
  pedido_id UUID,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT webhook_events_provider_event_uniq UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON public.webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_pedido_idx ON public.webhook_events (pedido_id);

GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy pra anon/authenticated → só service_role lê/escreve (via supabaseAdmin)
CREATE POLICY "service_role manages webhook_events"
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. UNIQUE parcial em pedidos.mercado_pago_id (permite NULL, bloqueia duplicidade)
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_mercado_pago_id_uniq
  ON public.pedidos (mercado_pago_id)
  WHERE mercado_pago_id IS NOT NULL;