-- v351 — custo real de quem entrega a quantidade
UPDATE public.pricing_items SET cost_brl = 100.50, price_brl = 364.45, last_cost_source = 'verified', is_sellable = true, sellable_reason = NULL WHERE pacote = 'tl50k';
UPDATE public.pricing_items SET cost_brl = 201.00, price_brl = 649.27, last_cost_source = 'verified', is_sellable = true, sellable_reason = NULL WHERE pacote = 'tl100k';
UPDATE public.pricing_items SET cost_brl = 482.00, price_brl = 1313.27, last_cost_source = 'verified', is_sellable = true, sellable_reason = NULL WHERE pacote = 'tl200k';
UPDATE public.pricing_items SET cost_brl = 1205.00, price_brl = 2799.79, last_cost_source = 'verified', is_sellable = true, sellable_reason = NULL WHERE pacote = 'tl500k';

-- Pacotes de YouTube acima de 1 milhão: sem rota viável a preço de mercado.
DELETE FROM public.pricing_items WHERE pacote IN ('yv1.5m','yv2m','yv3m','yv5m','yv10m');