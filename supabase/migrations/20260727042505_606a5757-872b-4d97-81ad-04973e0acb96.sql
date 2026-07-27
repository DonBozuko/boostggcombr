UPDATE admin_settings
SET value = jsonb_set(
  value,
  '{alvos}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'rede' = 'telegram:canal'
        THEN jsonb_set(elem, '{link}', '"https://t.me/eliteboostprime"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(value->'alvos') AS elem
  ), value->'alvos')
),
updated_at = now()
WHERE key = 'canary_config';