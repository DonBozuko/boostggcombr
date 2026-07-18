CREATE TABLE public.checkout_attempts (
  id BIGSERIAL PRIMARY KEY,
  instagram_user TEXT NOT NULL,
  plan_id TEXT,
  network TEXT,
  categoria TEXT,
  quantidade INTEGER,
  valor NUMERIC(12,2),
  url TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  recovered_pedido_id UUID,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.checkout_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.checkout_attempts_id_seq TO service_role;

ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkout_attempts service role only"
  ON public.checkout_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_checkout_attempts_created ON public.checkout_attempts (created_at DESC);
CREATE INDEX idx_checkout_attempts_ig ON public.checkout_attempts (instagram_user);