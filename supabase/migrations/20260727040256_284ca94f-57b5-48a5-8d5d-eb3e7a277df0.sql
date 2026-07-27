UPDATE public.admin_settings
SET value = jsonb_set(
      value,
      '{alvos}',
      (
        SELECT jsonb_agg(
          CASE WHEN a->>'rede' = 'facebook:seguidores'
            THEN jsonb_set(a, '{link}', to_jsonb('https://www.facebook.com/fabianosantiago.9779, https://www.facebook.com/profile.php?id=61591838405558'::text))
            ELSE a END
        )
        FROM jsonb_array_elements(value->'alvos') AS a
      )
    ),
    updated_at = now()
WHERE key = 'canary_config';