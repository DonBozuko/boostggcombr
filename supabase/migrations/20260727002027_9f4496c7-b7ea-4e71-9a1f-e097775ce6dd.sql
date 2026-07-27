UPDATE public.admin_settings
SET value = jsonb_set(
  value,
  '{alvos}',
  (
    SELECT jsonb_agg(
      CASE WHEN elem->>'rede' = 'kwai:seguidores'
        THEN elem || '{"link":"https://www.kwai.com/@fabiano_santiago","ativo":true}'::jsonb
        ELSE elem END
    )
    FROM jsonb_array_elements(value->'alvos') AS elem
  ) || jsonb_build_array(
    jsonb_build_object('rede','kwai:curtidas','pacote','kl100','quantidade',100,'link','https://www.kwai.com/@fabiano_santiago/video/5238962374664285340','ativo',true),
    jsonb_build_object('rede','kwai:visualizacoes','pacote','kv1k','quantidade',1000,'link','https://www.kwai.com/@fabiano_santiago/video/5238962374664285340','ativo',true)
  )
)
WHERE key = 'canary_config'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(value->'alvos') e WHERE e->>'rede' = 'kwai:curtidas'
  );