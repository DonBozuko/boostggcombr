-- v296: apaga entradas sintéticas (rate 0, injetadas pelo fallback)
DELETE FROM public.services_cache WHERE provider_service_id IN (14325, 14225, 18860) AND rate = 0;

-- Desvincula IDs smmhype (curados e auto) que não existem no catálogo real
UPDATE public.pricing_items p SET smmhype_service_id = NULL
WHERE p.smmhype_service_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.services_cache s WHERE s.provider_service_id::text = p.smmhype_service_id);

UPDATE public.pricing_items p SET smmhype_auto_id = NULL
WHERE p.smmhype_auto_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.services_cache s WHERE s.provider_service_id::text = p.smmhype_auto_id);

-- Pacotes sem nenhum ID de fornecedor saem da vitrine
UPDATE public.pricing_items
SET is_sellable = false,
    sellable_reason = 'v296: nenhum codigo de servico valido em nenhum fornecedor'
WHERE COALESCE(smmhype_service_id, smmhype_auto_id, smmpanel_service_id, smmpanel_auto_id,
               verified_service_id, verified_auto_id, provider4_service_id, provider4_auto_id) IS NULL;