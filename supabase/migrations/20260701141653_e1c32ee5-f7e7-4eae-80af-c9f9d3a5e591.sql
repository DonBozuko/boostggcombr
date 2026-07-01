ALTER TABLE public.pricing_items
  DROP CONSTRAINT IF EXISTS pricing_items_no_duplicate_service_ids;

ALTER TABLE public.pricing_items
  ADD CONSTRAINT pricing_items_no_duplicate_service_ids
  CHECK (
    (smmpanel_service_id IS NULL OR smmhype_service_id IS NULL OR smmpanel_service_id <> smmhype_service_id)
    AND
    (verified_service_id IS NULL OR smmhype_service_id IS NULL OR verified_service_id <> smmhype_service_id)
  );