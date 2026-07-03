
-- v164: Tabelas de cache separadas por fornecedor (paridade tri-provider)

CREATE TABLE IF NOT EXISTS public.smmpanel_services_cache (
  provider_service_id BIGINT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  rate NUMERIC NOT NULL DEFAULT 0,
  refill BOOLEAN NOT NULL DEFAULT false,
  min INTEGER NOT NULL DEFAULT 0,
  max INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.smmpanel_services_cache TO authenticated;
GRANT ALL ON public.smmpanel_services_cache TO service_role;
ALTER TABLE public.smmpanel_services_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc read authenticated smmpanel" ON public.smmpanel_services_cache FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.verified_services_cache (
  provider_service_id BIGINT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  rate NUMERIC NOT NULL DEFAULT 0,
  refill BOOLEAN NOT NULL DEFAULT false,
  min INTEGER NOT NULL DEFAULT 0,
  max INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verified_services_cache TO authenticated;
GRANT ALL ON public.verified_services_cache TO service_role;
ALTER TABLE public.verified_services_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc read authenticated verified" ON public.verified_services_cache FOR SELECT TO authenticated USING (true);

-- View de compatibilidade: smmhype_services_cache = services_cache (mantém código legado)
CREATE OR REPLACE VIEW public.smmhype_services_cache AS
SELECT provider_service_id, category, name, rate, refill, min, max, updated_at
FROM public.services_cache;
GRANT SELECT ON public.smmhype_services_cache TO authenticated, service_role;
