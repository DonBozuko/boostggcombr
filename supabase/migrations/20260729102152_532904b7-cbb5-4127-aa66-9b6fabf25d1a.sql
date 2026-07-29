UPDATE public.pricing_items
SET is_sellable = true, sellable_reason = NULL
WHERE pacote IN ('tl50k','tl100k','tl500k')
  AND is_sellable = false
  AND sellable_reason LIKE 'BANCADA:%';