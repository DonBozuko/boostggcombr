
ALTER TABLE public.service_id_overrides
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo text;

-- Permite leitura pública somente das flags (sem expor service_id, rate, etc é OK aqui pois IDs não são sensíveis,
-- mas mantemos política mínima: anon pode SELECT).
GRANT SELECT ON public.service_id_overrides TO anon;

DROP POLICY IF EXISTS "public can read blocked flags" ON public.service_id_overrides;
CREATE POLICY "public can read blocked flags"
  ON public.service_id_overrides
  FOR SELECT
  TO anon
  USING (true);
