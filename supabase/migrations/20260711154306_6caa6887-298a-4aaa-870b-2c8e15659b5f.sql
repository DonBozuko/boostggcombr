-- Limpa entradas geradas pelo auto-populador (fonte dos IDs falsos)
DELETE FROM public.service_id_matrix WHERE notes LIKE 'auto:%';

-- Semeia IDs BR reais validados no catálogo SMMhype (curadoria manual)
-- Instagram Followers BR: id 4100 (Standard, refill 30d, min10 max10k)
INSERT INTO public.service_id_matrix (network, service_type, min_qty, max_qty, service_id, tier_label, notes)
VALUES
  ('instagram','followers_br',100,2000,   4100,'pequeno','curado:4100 IG BR Standard Refill 30d'),
  ('instagram','followers_br',2001,10000, 4100,'medio',  'curado:4100 IG BR Standard Refill 30d'),
  -- Instagram Likes BR: 14441 até 20k, 9264 acima
  ('instagram','likes_br',100,2000,   14441,'pequeno','curado:14441 IG BR Likes Refill 30d'),
  ('instagram','likes_br',2001,20000, 14441,'medio',  'curado:14441 IG BR Likes Refill 30d'),
  ('instagram','likes_br',20001,100000, 9264,'grande', 'curado:9264 IG BR Likes Refill 365d'),
  -- TikTok Followers BR: 4292 (Standard, min10 max10M)
  ('tiktok','followers_br',100,2000,   4292,'pequeno','curado:4292 TikTok BR Standard'),
  ('tiktok','followers_br',2001,20000, 4292,'medio',  'curado:4292 TikTok BR Standard'),
  ('tiktok','followers_br',20001,100000, 4292,'grande','curado:4292 TikTok BR Standard')
ON CONFLICT (network, service_type, min_qty, max_qty) DO UPDATE
  SET service_id = EXCLUDED.service_id,
      tier_label = EXCLUDED.tier_label,
      notes = EXCLUDED.notes;