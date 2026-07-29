CREATE TABLE IF NOT EXISTS public.funnel_events (
  id bigserial PRIMARY KEY,
  step text NOT NULL,
  session_id text,
  device_id text,
  plan_id text,
  categoria text,
  valor numeric,
  path text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funnel_events_created_idx ON public.funnel_events (created_at DESC);
CREATE INDEX IF NOT EXISTS funnel_events_step_idx ON public.funnel_events (step, created_at DESC);
GRANT ALL ON public.funnel_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.funnel_events_id_seq TO service_role;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;