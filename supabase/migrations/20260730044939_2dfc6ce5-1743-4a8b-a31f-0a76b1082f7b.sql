CREATE TABLE IF NOT EXISTS public.shelf_vetoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pacote TEXT NOT NULL,
  source TEXT NOT NULL,
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  UNIQUE (pacote, source)
);

CREATE INDEX IF NOT EXISTS shelf_vetoes_pacote_idx ON public.shelf_vetoes (pacote);
CREATE INDEX IF NOT EXISTS shelf_vetoes_expires_idx ON public.shelf_vetoes (expires_at);

GRANT SELECT ON public.shelf_vetoes TO authenticated;
GRANT ALL ON public.shelf_vetoes TO service_role;

ALTER TABLE public.shelf_vetoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shelf_vetoes_no_public_access" ON public.shelf_vetoes FOR SELECT TO authenticated USING (false);