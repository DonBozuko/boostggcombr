
-- v174 — Recalcula pricing_items com tier ramp + scaled floor.
-- Fórmula: preço = max(scaled_floor, ceil2(raw))
--   raw = (cost * 5.0 * tier * 1.15 + 0.49) / 0.9901
--   tier: ≤500→1.0 ; ≤5000→1.6 ; 5k-15k→rampa 1.6→2.4 ; >15k→2.4
--   scaled_floor: ≤500→5 ; else 5 + ((qty-500)/1000)*2

UPDATE public.pricing_items
SET price_brl = GREATEST(
  -- piso escalar
  CASE
    WHEN quantidade <= 500 THEN 5.00
    ELSE 5.00 + ((quantidade - 500)::numeric / 1000.0) * 2.0
  END,
  -- fórmula com tier ramp, arredondado ao múltiplo de 0,50 pra cima
  CEIL((
    (cost_brl * 5.0 * (
      CASE
        WHEN quantidade <= 500  THEN 1.0
        WHEN quantidade <= 5000 THEN 1.6
        WHEN quantidade <= 15000 THEN 1.6 + ((quantidade - 5000)::numeric / 10000.0) * 0.8
        ELSE 2.4
      END
    ) * 1.15 + 0.49) / 0.9901
  ) * 2) / 2.0
)::numeric(12,2)
WHERE cost_brl > 0 AND quantidade > 0;
