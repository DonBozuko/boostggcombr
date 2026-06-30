
-- Strict 1-to-1 Provider ID Mapping Matrix v49
CREATE TABLE IF NOT EXISTS public.service_id_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  service_type text NOT NULL,
  min_qty integer NOT NULL DEFAULT 0,
  max_qty integer NOT NULL DEFAULT 2147483647,
  service_id integer NOT NULL,
  tier_label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_id_matrix TO authenticated;
GRANT ALL ON public.service_id_matrix TO service_role;

ALTER TABLE public.service_id_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matrix director read" ON public.service_id_matrix
  FOR SELECT TO authenticated USING (public.is_director());

CREATE INDEX IF NOT EXISTS service_id_matrix_lookup
  ON public.service_id_matrix (network, service_type, min_qty, max_qty);

-- Seed (3 tiers por rede/tipo) usando os IDs atuais como ponto de partida.
-- O Jarvis sobrescreve os tiers wholesale/bulk com IDs super-atacado conforme calibração.
INSERT INTO public.service_id_matrix (network, service_type, min_qty, max_qty, service_id, tier_label) VALUES
  ('instagram','followers',    0,   2000, 14325, 'retail'),
  ('instagram','followers', 2001, 100000, 14225, 'wholesale'),
  ('instagram','followers',100001, 2147483647, 14225, 'bulk'),
  ('instagram','likes',        0,   2000, 18860, 'retail'),
  ('instagram','likes',     2001, 2147483647, 18860, 'wholesale'),
  ('instagram','views',        0,  10000, 18855, 'retail'),
  ('instagram','views',    10001, 2147483647, 18855, 'wholesale'),
  ('tiktok','followers',       0,   2000, 14330, 'retail'),
  ('tiktok','followers',    2001, 2147483647, 14330, 'wholesale'),
  ('tiktok','likes',           0,   2000, 19191, 'retail'),
  ('tiktok','likes',        2001, 2147483647, 19191, 'wholesale'),
  ('tiktok','views',           0,  10000, 14907, 'retail'),
  ('tiktok','views',       10001, 2147483647, 14907, 'wholesale'),
  ('youtube','followers',      0,   1000, 19440, 'retail'),
  ('youtube','followers',   1001, 2147483647, 19440, 'wholesale'),
  ('youtube','views',          0,  10000, 14321, 'retail'),
  ('youtube','views',      10001, 2147483647, 14321, 'wholesale'),
  ('facebook','followers',     0,   2000, 18870, 'retail'),
  ('facebook','followers',  2001, 2147483647, 18870, 'wholesale'),
  ('facebook','likes',         0,   2000,  7593, 'retail'),
  ('facebook','likes',      2001, 2147483647,  7593, 'wholesale'),
  ('telegram','canal',         0,   1000, 19106, 'retail'),
  ('telegram','canal',      1001, 2147483647, 19106, 'wholesale'),
  ('telegram','grupo',         0,   1000, 19107, 'retail'),
  ('telegram','grupo',      1001, 2147483647, 19107, 'wholesale'),
  ('trafego','br',             0,  10000,  9313, 'retail'),
  ('trafego','br',         10001, 2147483647,  9313, 'wholesale'),
  ('trafego','global',         0,  10000, 10351, 'retail'),
  ('trafego','global',     10001, 2147483647, 10351, 'wholesale')
ON CONFLICT DO NOTHING;
