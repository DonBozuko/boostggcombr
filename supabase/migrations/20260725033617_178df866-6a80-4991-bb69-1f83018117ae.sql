UPDATE public.fornecedores
SET api_url = 'https://seguidoresup.com.br/api/v2',
    cotacao_brl = 1.0,
    updated_at = now()
WHERE slug = 'provider4';

TRUNCATE public.provider4_services_cache RESTART IDENTITY;

UPDATE public.pricing_items
SET provider4_service_id = NULL,
    provider4_auto_id = NULL
WHERE provider4_service_id IS NOT NULL OR provider4_auto_id IS NOT NULL;

SELECT slug, api_url, cotacao_brl, ativo FROM public.fornecedores WHERE slug = 'provider4';