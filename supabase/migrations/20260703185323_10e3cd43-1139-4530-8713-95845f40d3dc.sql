
UPDATE pricing_items
SET price_brl = GREATEST(
      5.0,
      CEIL(((cost_brl * 5.0 * 
        CASE 
          WHEN quantidade <= 500 THEN 1.0
          WHEN quantidade <= 10000 THEN 1.6
          ELSE 2.4
        END
        * 1.15 + 0.49) / 0.9901) * 2) / 2.0
    ),
    synced_at = NOW()
WHERE cost_brl > 0;
