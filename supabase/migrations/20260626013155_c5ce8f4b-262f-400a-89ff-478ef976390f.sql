CREATE TABLE IF NOT EXISTS public.jarvis_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  severidade TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'system',
  mensagem TEXT NOT NULL,
  detalhe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jarvis_alerts_created_at_idx ON public.jarvis_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS jarvis_alerts_severidade_idx ON public.jarvis_alerts (severidade);
CREATE INDEX IF NOT EXISTS jarvis_alerts_origem_idx ON public.jarvis_alerts (origem);

GRANT SELECT ON public.jarvis_alerts TO anon;
GRANT SELECT, INSERT ON public.jarvis_alerts TO authenticated;
GRANT ALL ON public.jarvis_alerts TO service_role;

ALTER TABLE public.jarvis_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read jarvis alerts" ON public.jarvis_alerts FOR SELECT USING (true);
CREATE POLICY "Authenticated insert jarvis alerts" ON public.jarvis_alerts FOR INSERT TO authenticated WITH CHECK (true);