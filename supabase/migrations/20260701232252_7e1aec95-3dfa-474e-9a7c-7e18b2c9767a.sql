-- v136 — Isolamento tripartite: hype ≠ panel ≠ verified quando não nulos.
-- Substitui o CHECK antigo (que só bloqueava contra hype) por trava completa.
ALTER TABLE public.pricing_items
  DROP CONSTRAINT IF EXISTS pricing_items_no_duplicate_service_ids;

ALTER TABLE public.pricing_items
  ADD CONSTRAINT pricing_items_no_duplicate_service_ids CHECK (
    (smmhype_service_id  IS NULL OR smmpanel_service_id  IS NULL OR smmhype_service_id  <> smmpanel_service_id)
    AND (smmhype_service_id  IS NULL OR verified_service_id IS NULL OR smmhype_service_id  <> verified_service_id)
    AND (smmpanel_service_id IS NULL OR verified_service_id IS NULL OR smmpanel_service_id <> verified_service_id)
  );