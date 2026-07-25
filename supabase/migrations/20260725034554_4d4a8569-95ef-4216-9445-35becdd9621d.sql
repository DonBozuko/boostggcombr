UPDATE public.fornecedores
   SET nome = 'Avanco Social',
       api_url = 'https://avancosocial.com.br/api/v2',
       cotacao_brl = 5.0781,
       ativo = false,
       prioridade = 400
 WHERE slug = 'provider4';

TRUNCATE public.provider4_services_cache;

UPDATE public.pricing_items
   SET provider4_service_id = NULL,
       provider4_auto_id = NULL
 WHERE provider4_service_id IS NOT NULL
    OR provider4_auto_id IS NOT NULL;
