ALTER TABLE public.pricing_items
  ADD COLUMN IF NOT EXISTS smmhype_service_id text,
  ADD COLUMN IF NOT EXISTS smmpanel_service_id text,
  ADD COLUMN IF NOT EXISTS verified_service_id text;

-- Seed inicial: espelha o provider_service_id atual (SMMhype é o primário)
UPDATE public.pricing_items
   SET smmhype_service_id = COALESCE(smmhype_service_id, provider_service_id::text)
 WHERE provider_service_id IS NOT NULL;