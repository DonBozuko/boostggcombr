-- v240 — Corrige mapeamento BR TikTok + remove serviços tóxicos
UPDATE public.pricing_items
SET verified_service_id = NULL
WHERE verified_service_id IN ('986','982');

UPDATE public.pricing_items
SET verified_service_id = NULL
WHERE category = 'trafego:br' AND verified_service_id = '760';

UPDATE public.pricing_items
SET smmhype_service_id = '4295',
    smmpanel_service_id = '131'
WHERE category = 'tiktok:seguidores:br';

UPDATE public.pricing_items
SET is_sellable = false,
    sellable_reason = 'Revalidando fornecedor (v240)'
WHERE category IN ('tiktok:seguidores:br','trafego:br');