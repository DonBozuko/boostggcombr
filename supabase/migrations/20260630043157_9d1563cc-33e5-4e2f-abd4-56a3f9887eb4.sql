
CREATE TABLE IF NOT EXISTS public.pricing_items (
  pacote text PRIMARY KEY,
  category text NOT NULL,
  quantidade integer NOT NULL,
  provider_service_id integer,
  cost_brl numeric(12,4) NOT NULL DEFAULT 0,
  price_brl numeric(12,2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'fallback',
  synced_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_items TO anon, authenticated;
GRANT ALL ON public.pricing_items TO service_role;

ALTER TABLE public.pricing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_items public read" ON public.pricing_items;
CREATE POLICY "pricing_items public read" ON public.pricing_items
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pricing_items service write" ON public.pricing_items;
CREATE POLICY "pricing_items service write" ON public.pricing_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS pricing_items_category_idx ON public.pricing_items(category, quantidade);
