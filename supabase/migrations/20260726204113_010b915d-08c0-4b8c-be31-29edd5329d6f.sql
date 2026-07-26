CREATE TABLE IF NOT EXISTS public.canary_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  pacote text NOT NULL,
  quantidade integer NOT NULL,
  target_link text NOT NULL,
  provider_slug text,
  provider_order_id text,
  cost_brl numeric(12,2),
  status text NOT NULL DEFAULT 'dispatched',
  remains integer,
  last_checked_at timestamptz,
  delivered_at timestamptz,
  detail text
);

CREATE INDEX IF NOT EXISTS idx_canary_runs_created ON public.canary_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canary_runs_open ON public.canary_runs (status) WHERE status IN ('dispatched','processing');

GRANT SELECT ON public.canary_runs TO authenticated;
GRANT ALL ON public.canary_runs TO service_role;

ALTER TABLE public.canary_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canary_runs_director_read" ON public.canary_runs;
CREATE POLICY "canary_runs_director_read" ON public.canary_runs
  FOR SELECT TO authenticated
  USING (public.is_director());