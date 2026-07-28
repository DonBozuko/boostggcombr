CREATE OR REPLACE FUNCTION public.enforce_pricing_markup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  qty INTEGER := COALESCE(NEW.quantidade, 0);
  c NUMERIC := COALESCE(NEW.cost_brl, 0);
  tier NUMERIC;
  cost_tier NUMERIC;
  floor_brl NUMERIC(12,2);
  min_price NUMERIC(12,2);
BEGIN
  -- Rede de seguranca por QUANTIDADE (inalterada)
  IF qty <= 500 THEN
    tier := 3.0;
  ELSIF qty <= 5000 THEN
    tier := 4.0;
  ELSIF qty < 15000 THEN
    tier := 4.0 + 2.0 * ((qty - 5000)::NUMERIC / 10000.0);
  ELSE
    tier := 6.0;
  END IF;

  -- v328: teto de markup por CUSTO ABSOLUTO (interpolacao log, sem degrau).
  -- Mantido ~25% ABAIXO do alvo do app para a trava nunca brigar com a
  -- Autoridade de Preco: aqui e apenas piso de prejuizo, nao formula de venda.
  IF c <= 5 THEN
    cost_tier := 3.75;
  ELSIF c <= 50 THEN
    cost_tier := 3.75 * power(2.60 / 3.75, ln(c / 5.0) / ln(10.0));
  ELSIF c <= 300 THEN
    cost_tier := 2.60 * power(1.95 / 2.60, ln(c / 50.0) / ln(6.0));
  ELSIF c <= 1000 THEN
    cost_tier := 1.95 * power(1.50 / 1.95, ln(c / 300.0) / ln(1000.0 / 300.0));
  ELSE
    cost_tier := 1.50;
  END IF;

  IF c > 0 THEN
    tier := LEAST(tier, cost_tier);
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