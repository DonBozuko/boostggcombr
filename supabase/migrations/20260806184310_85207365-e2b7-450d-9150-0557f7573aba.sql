-- v521: limpeza de vinculos fantasma. Remove o vinculo com um servico do
-- fornecedor primario que nao entrega a quantidade do pacote (max menor que a
-- quantidade). Nao toca em pacotes sem alternativa de reserva.
UPDATE public.pricing_items pi
SET smmhype_service_id = NULL,
    provider_service_id = NULL
FROM public.smmhype_services_cache sc
WHERE sc.provider_service_id::text = pi.smmhype_service_id::text
  AND sc.max IS NOT NULL
  AND sc.max > 0
  AND pi.quantidade > sc.max
  AND (pi.verified_service_id IS NOT NULL OR pi.smmpanel_service_id IS NOT NULL);