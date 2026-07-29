UPDATE public.pricing_items
SET is_sellable = true, sellable_reason = NULL
WHERE is_sellable = false
  AND sellable_reason LIKE 'BANCADA:%'
  AND pacote IN ('yv1.5m','yv2m','yv3m','yv5m','yv10m','br-tf100');