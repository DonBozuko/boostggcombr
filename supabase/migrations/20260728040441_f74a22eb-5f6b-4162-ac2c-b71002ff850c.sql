UPDATE public.pricing_items
SET smmhype_service_id = NULL,
    smmhype_auto_id = NULL
WHERE (smmhype_service_id = '18855' OR smmhype_auto_id = '18855')
  AND category ILIKE '%visualiz%';