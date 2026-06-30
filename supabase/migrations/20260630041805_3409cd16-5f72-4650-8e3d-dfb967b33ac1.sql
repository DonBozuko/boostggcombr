CREATE TABLE IF NOT EXISTS public.pricing_cache (
  category TEXT PRIMARY KEY,
  cost_per_1k_brl NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_cache TO anon, authenticated;
GRANT ALL ON public.pricing_cache TO service_role;
ALTER TABLE public.pricing_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_cache public read" ON public.pricing_cache FOR SELECT USING (true);
CREATE POLICY "pricing_cache service write" ON public.pricing_cache FOR ALL TO service_role USING (true) WITH CHECK (true);