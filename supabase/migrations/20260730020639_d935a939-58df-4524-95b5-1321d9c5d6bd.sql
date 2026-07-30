update admin_settings
set value = jsonb_set(
  value::jsonb,
  '{alvos}',
  (
    select jsonb_agg(
      a || jsonb_build_object(
        'intervalo_horas',
        case a->>'pacote'
          when 'yv1k' then 48
          when 'kv1k' then 48
          when 'ys50' then 48
          when 'tf100' then 24
          else 0
        end
      )
      order by ord
    )
    from jsonb_array_elements(value::jsonb -> 'alvos') with ordinality as t(a, ord)
  )
),
updated_at = now()
where key = 'canary_config';