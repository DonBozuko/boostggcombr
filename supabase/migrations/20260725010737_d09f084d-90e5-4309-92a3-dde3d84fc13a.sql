-- v245 — Infraestrutura para 4º fornecedor

ALTER TABLE public.pricing_items
  ADD COLUMN IF NOT EXISTS provider4_service_id text,
  ADD COLUMN IF NOT EXISTS provider4_auto_id text;

CREATE TABLE IF NOT EXISTS public.provider4_services_cache (
  provider_service_id integer PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  refill boolean NOT NULL DEFAULT false,
  min integer NOT NULL DEFAULT 0,
  max integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider4_services_cache TO authenticated;
GRANT ALL ON public.provider4_services_cache TO service_role;

ALTER TABLE public.provider4_services_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read provider4 cache"
  ON public.provider4_services_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manage provider4 cache"
  ON public.provider4_services_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
