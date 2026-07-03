
-- Função que calcula o preço mínimo obrigatório
CREATE OR REPLACE FUNCTION public.enforce_pricing_markup()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  min_price NUMERIC(12,2);
BEGIN
  -- Markup 350%: preço = custo × 4,5. Piso absoluto: R$ 5,00.
  min_price := GREATEST(
    5.00,
    CEIL((NEW.cost_brl * 4.5) * 100) / 100.0
  );

  -- Se o preço vindo do sync/update ficou abaixo do mínimo, força para cima.
  IF NEW.price_brl < min_price THEN
    NEW.price_brl := min_price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pricing_items_enforce_markup ON public.pricing_items;
CREATE TRIGGER pricing_items_enforce_markup
BEFORE INSERT OR UPDATE OF cost_brl, price_brl ON public.pricing_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pricing_markup();

-- Backfill: reaplica em todos os pacotes existentes.
UPDATE public.pricing_items
SET price_brl = GREATEST(5.00, CEIL((cost_brl * 4.5) * 100) / 100.0),
    synced_at = now()
WHERE price_brl < GREATEST(5.00, CEIL((cost_brl * 4.5) * 100) / 100.0);
