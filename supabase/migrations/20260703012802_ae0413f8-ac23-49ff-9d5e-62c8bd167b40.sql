
CREATE TABLE IF NOT EXISTS public.provider_rates_cache (
  provider_slug text NOT NULL,
  provider_service_id text NOT NULL,
  rate_usd numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_slug, provider_service_id)
);
GRANT ALL ON public.provider_rates_cache TO service_role;
ALTER TABLE public.provider_rates_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.provider_rates_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
