CREATE OR REPLACE FUNCTION public.enforce_pricing_markup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  qty INTEGER := COALESCE(NEW.quantidade, 0);
  tier NUMERIC;
  floor_brl NUMERIC(12,2);
  min_price NUMERIC(12,2);
BEGIN
  -- Multiplicador reduzido: 3x (pequenos) até 6x (grandes)
  IF qty <= 500 THEN
    tier := 3.0;
  ELSIF qty <= 5000 THEN
    tier := 4.0;
  ELSIF qty < 15000 THEN
    tier := 4.0 + 2.0 * ((qty - 5000)::NUMERIC / 10000.0);
  ELSE
    tier := 6.0;
  END IF;

  IF qty > 500 THEN
    floor_brl := 5.00 + ((qty - 500)::NUMERIC / 1000.0) * 2.0;
  ELSE
    floor_brl := 5.00;
  END IF;

  min_price := GREATEST(
    floor_brl,
    CEIL(((NEW.cost_brl * tier * 1.15 + 0.49) / 0.9901) * 100) / 100.0
  );

  IF NEW.price_brl < min_price THEN
    NEW.price_brl := min_price;
  END IF;
  RETURN NEW;
END;
$function$;