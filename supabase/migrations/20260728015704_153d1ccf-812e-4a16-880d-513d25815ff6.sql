CREATE TABLE public.service_fingerprints (
  pacote text NOT NULL,
  col text NOT NULL,
  provider text NOT NULL,
  service_id text NOT NULL,
  service_name text NOT NULL,
  name_sig text NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  drift_count integer NOT NULL DEFAULT 0,
  last_drift_at timestamptz,
  last_drift_name text,
  PRIMARY KEY (pacote, col)
);
GRANT ALL ON public.service_fingerprints TO service_role;
ALTER TABLE public.service_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fingerprints admin read" ON public.service_fingerprints FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.is_director());
GRANT SELECT ON public.service_fingerprints TO authenticated;