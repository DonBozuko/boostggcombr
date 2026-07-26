INSERT INTO public.pricing_items
  (pacote, category, quantidade, cost_brl, price_brl, source, smmhype_service_id, refill_supported, refill_checked_at, is_sellable)
VALUES
  ('br-pro100',  'instagram:seguidores:br',   100,  0.7350,   7.90, 'curado', '8431', true, now(), true),
  ('br-pro250',  'instagram:seguidores:br',   250,  1.8375,  17.90, 'curado', '8431', true, now(), true),
  ('br-pro500',  'instagram:seguidores:br',   500,  3.6750,  34.90, 'curado', '8431', true, now(), true),
  ('br-pro1k',   'instagram:seguidores:br',  1000,  7.3500,  69.90, 'curado', '8431', true, now(), true),
  ('br-pro2k',   'instagram:seguidores:br',  2000, 14.7000, 137.90, 'curado', '8431', true, now(), true),
  ('br-pro5k',   'instagram:seguidores:br',  5000, 36.7500, 339.90, 'curado', '8431', true, now(), true)
ON CONFLICT (pacote) DO UPDATE SET
  cost_brl = EXCLUDED.cost_brl,
  price_brl = EXCLUDED.price_brl,
  smmhype_service_id = EXCLUDED.smmhype_service_id,
  refill_supported = true,
  refill_checked_at = now(),
  is_sellable = true;

UPDATE public.pricing_items SET refill_supported = true, refill_checked_at = now()
WHERE pacote IN ('br-p100','br-p250','br-p500','br-p1k','br-p2k','br-p5k','br-p10k','br-tf100','br-tf500','br-tf1k','br-tf2k','br-tf5k');