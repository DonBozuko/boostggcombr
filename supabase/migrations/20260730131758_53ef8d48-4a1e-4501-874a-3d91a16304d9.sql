CREATE TABLE public.dispatch_attempts_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid,
  provider_slug text NOT NULL,
  pacote text,
  service_id text,
  quantidade integer,
  target_link text,
  http_status integer,
  raw_response text,
  ok boolean NOT NULL DEFAULT false,
  order_id text,
  error_text text,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.dispatch_attempts_logs TO service_role;
GRANT SELECT ON public.dispatch_attempts_logs TO authenticated;

ALTER TABLE public.dispatch_attempts_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins leem trilha de despacho"
ON public.dispatch_attempts_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_dispatch_logs_created ON public.dispatch_attempts_logs (created_at DESC);
CREATE INDEX idx_dispatch_logs_pedido ON public.dispatch_attempts_logs (pedido_id);
CREATE INDEX idx_dispatch_logs_provider ON public.dispatch_attempts_logs (provider_slug, created_at DESC);