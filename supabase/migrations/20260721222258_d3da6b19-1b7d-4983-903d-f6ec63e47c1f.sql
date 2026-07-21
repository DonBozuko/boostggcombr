
CREATE TABLE public.auto_resolver_failures (
  pacote TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('smmhype','smmpanel','verified')),
  fail_count INTEGER NOT NULL DEFAULT 1,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_alerted_at TIMESTAMPTZ,
  PRIMARY KEY (pacote, provider)
);
GRANT SELECT ON public.auto_resolver_failures TO authenticated;
GRANT ALL ON public.auto_resolver_failures TO service_role;
ALTER TABLE public.auto_resolver_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diretor le falhas resolver" ON public.auto_resolver_failures
  FOR SELECT TO authenticated USING (public.is_director());
