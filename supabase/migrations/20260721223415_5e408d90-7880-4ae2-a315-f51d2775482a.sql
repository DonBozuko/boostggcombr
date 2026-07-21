-- v187: backfill Verified auto_id para pacotes Kwai (todos hoje 100% órfãos no Verified).
-- Só popula verified_auto_id quando verified_service_id (manual) está NULL — nunca sobrescreve manual.
WITH verified_kwai AS (
  SELECT provider_service_id, name, rate::numeric AS rate, min::int AS min, max::int AS max,
    CASE
      WHEN name ILIKE '%seguidor%' OR name ILIKE '%follow%' THEN 'kwai:seguidores'
      WHEN name ILIKE '%curtida%' OR name ILIKE '%like%' THEN 'kwai:curtidas'
      WHEN name ILIKE '%visualiz%' OR name ILIKE '%view%' THEN 'kwai:visualizacoes'
      WHEN name ILIKE '%compartilh%' OR name ILIKE '%share%' THEN 'kwai:compartilhamentos'
      ELSE NULL
    END AS tipo,
    (name ILIKE '%sem queda%' OR name ILIKE '%r30%' OR name ILIKE '%r90%') AS has_refill
  FROM verified_services_cache
  WHERE name ILIKE '%kwai%'
    AND (name ILIKE '%brasileir%' OR name ILIKE '%brasil%')
),
ranked AS (
  SELECT ki.pacote, vk.provider_service_id,
    ROW_NUMBER() OVER (
      PARTITION BY ki.pacote
      ORDER BY (CASE WHEN vk.has_refill THEN 0 ELSE 1 END), vk.rate ASC
    ) AS rn
  FROM pricing_items ki
  JOIN verified_kwai vk ON vk.tipo = ki.category
  WHERE ki.category LIKE 'kwai%'
    AND ki.verified_service_id IS NULL
    AND ki.quantidade BETWEEN vk.min AND vk.max
)
UPDATE pricing_items p
SET verified_auto_id = r.provider_service_id,
    auto_resolved_at = now()
FROM ranked r
WHERE p.pacote = r.pacote AND r.rn = 1;

-- Limpa contador de falhas para pacotes Kwai que agora resolveram.
DELETE FROM auto_resolver_failures
WHERE provider = 'verified'
  AND pacote IN (SELECT pacote FROM pricing_items WHERE category LIKE 'kwai%' AND verified_auto_id IS NOT NULL);