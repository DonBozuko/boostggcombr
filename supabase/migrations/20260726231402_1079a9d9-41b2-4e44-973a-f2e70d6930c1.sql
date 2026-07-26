CREATE TABLE IF NOT EXISTS public.canary_quarantine (
  pacote text NOT NULL,
  provider_slug text NOT NULL,
  until timestamptz NOT NULL,
  reason text,
  hits integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pacote, provider_slug)
);
GRANT ALL ON public.canary_quarantine TO service_role;
ALTER TABLE public.canary_quarantine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canary_quarantine_admin_read" ON public.canary_quarantine FOR SELECT TO authenticated USING (public.is_director());

CREATE TABLE IF NOT EXISTS public.canary_alert_state (
  alert_key text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  detail text
);
GRANT ALL ON public.canary_alert_state TO service_role;
ALTER TABLE public.canary_alert_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canary_alert_state_admin_read" ON public.canary_alert_state FOR SELECT TO authenticated USING (public.is_director());