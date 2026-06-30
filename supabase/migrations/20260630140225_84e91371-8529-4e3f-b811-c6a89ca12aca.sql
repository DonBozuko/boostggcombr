
CREATE TABLE IF NOT EXISTS public.provider_health (
  slug TEXT PRIMARY KEY,
  unstable_until TIMESTAMPTZ,
  last_error TEXT,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provider_health TO authenticated;
GRANT ALL ON public.provider_health TO service_role;

ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_health director read"
  ON public.provider_health FOR SELECT
  TO authenticated
  USING (public.is_director());
