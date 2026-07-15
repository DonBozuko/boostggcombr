CREATE TABLE public.pix_recovery_queue (
  id BIGSERIAL PRIMARY KEY,
  pedido_id UUID NOT NULL UNIQUE,
  mercado_pago_id TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  rede_social TEXT,
  pacote TEXT,
  whatsapp TEXT,
  instagram_user TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  attempts INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contacted_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_status ON public.pix_recovery_queue (status, next_action_at);
CREATE INDEX idx_recovery_pedido ON public.pix_recovery_queue (pedido_id);

GRANT ALL ON public.pix_recovery_queue TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pix_recovery_queue_id_seq TO service_role;

ALTER TABLE public.pix_recovery_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recovery service role only"
  ON public.pix_recovery_queue FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_recovery_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recovery_updated_at
  BEFORE UPDATE ON public.pix_recovery_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_recovery_updated_at();