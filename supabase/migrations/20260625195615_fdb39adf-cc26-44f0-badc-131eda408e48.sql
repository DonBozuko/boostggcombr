CREATE TABLE public.service_id_overrides (
  network TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  rate NUMERIC,
  previous_service_id INTEGER,
  previous_rate NUMERIC,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (network, service_type)
);
GRANT ALL ON public.service_id_overrides TO service_role;
ALTER TABLE public.service_id_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role full access overrides" ON public.service_id_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);