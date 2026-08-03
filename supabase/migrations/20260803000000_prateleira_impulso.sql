-- v407: Prateleira de Impulso - Pacotes de entrada estáveis (R,90 - R9,90)
-- Garante opções de compra acessíveis e rotas resilientes.

INSERT INTO public.pricing_items (pacote, category, quantidade, cost_brl, price_brl, is_sellable, last_cost_source)
VALUES 
  ('l100_v2', 'instagram:curtidas', 100, 0.50, 9.90, true, 'manual'),
  ('l250_v2', 'instagram:curtidas', 250, 1.20, 14.90, true, 'manual'),
  ('l500_v2', 'instagram:curtidas', 500, 2.40, 19.90, true, 'manual')
ON CONFLICT (pacote) DO UPDATE SET 
  price_brl = EXCLUDED.price_brl,
  is_sellable = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_items TO authenticated;
GRANT ALL ON public.pricing_items TO service_role;
GRANT SELECT ON public.pricing_items TO anon;
