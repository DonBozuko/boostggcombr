-- v172: Strict 400%+15% Margin Guard
-- Trigger: preço mínimo = (custo * 5.0 * 1.15 + 0.49) / 0.9901, piso R$ 5,00
CREATE OR REPLACE FUNCTION public.enforce_pricing_markup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  min_price NUMERIC(12,2);
BEGIN
  -- Fórmula Fabiano v172: 400% lucro + 15% buffer PRIME15 + taxa Pix 0,99% + R$ 0,49.
  -- Piso absoluto: R$ 5,00.
  min_price := GREATEST(
    5.00,
    CEIL(((NEW.cost_brl * 5.0 * 1.15 + 0.49) / 0.9901) * 100) / 100.0
  );
  IF NEW.price_brl < min_price THEN
    NEW.price_brl := min_price;
  END IF;
  RETURN NEW;
END;
$function$;

-- Garante que o trigger está anexado (idempotente)
DROP TRIGGER IF EXISTS trg_enforce_pricing_markup ON public.pricing_items;
CREATE TRIGGER trg_enforce_pricing_markup
  BEFORE INSERT OR UPDATE ON public.pricing_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pricing_markup();
