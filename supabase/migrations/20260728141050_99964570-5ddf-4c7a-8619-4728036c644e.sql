CREATE TABLE IF NOT EXISTS public.bench_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  origem text NOT NULL DEFAULT 'cron',
  total int NOT NULL DEFAULT 0,
  entregavel int NOT NULL DEFAULT 0,
  por_veredito jsonb NOT NULL DEFAULT '{}'::jsonb,
  recarga_por_fornecedor jsonb NOT NULL DEFAULT '{}'::jsonb,
  rotas_com_problema text[] NOT NULL DEFAULT '{}',
  pausados text[] NOT NULL DEFAULT '{}',
  religados text[] NOT NULL DEFAULT '{}',
  alertou boolean NOT NULL DEFAULT false,
  erro text
);

CREATE TABLE IF NOT EXISTS public.bench_findings (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.bench_runs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  pacote text NOT NULL,
  category text,
  quantidade int,
  price_brl numeric,
  verdict text NOT NULL,
  motivo text,
  fornecedor text,
  custo_brl numeric,
  falta_recarregar numeric,
  falta_em text
);

CREATE INDEX IF NOT EXISTS bench_findings_run_idx ON public.bench_findings(run_id);
CREATE INDEX IF NOT EXISTS bench_runs_started_idx ON public.bench_runs(started_at DESC);

GRANT ALL ON public.bench_runs TO service_role;
GRANT ALL ON public.bench_findings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.bench_findings_id_seq TO service_role;

ALTER TABLE public.bench_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bench_findings ENABLE ROW LEVEL SECURITY;