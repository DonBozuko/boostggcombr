update public.admin_settings
set value = jsonb_build_object(
  'enabled', true,
  'interval_hours', 12,
  'sla_hours', 6,
  'alvos', jsonb_build_array(
    jsonb_build_object('rede','instagram:seguidores','pacote','p100','quantidade',100,'link', coalesce((value->'alvos'->0->>'link'),''),'ativo', coalesce((value->'alvos'->0->>'link'),'') <> ''),
    jsonb_build_object('rede','instagram:curtidas','pacote','l50','quantidade',50,'link','','ativo',false),
    jsonb_build_object('rede','instagram:visualizacoes','pacote','v1k','quantidade',1000,'link','','ativo',false),
    jsonb_build_object('rede','instagram:seguidores:br','pacote','br-p100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','tiktok:seguidores','pacote','tf100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','tiktok:curtidas','pacote','tl100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','tiktok:visualizacoes','pacote','tv1k','quantidade',1000,'link','','ativo',false),
    jsonb_build_object('rede','youtube:inscritos','pacote','ys50','quantidade',50,'link','','ativo',false),
    jsonb_build_object('rede','youtube:visualizacoes','pacote','yv1k','quantidade',1000,'link','','ativo',false),
    jsonb_build_object('rede','kwai:seguidores','pacote','kf100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','telegram:canal','pacote','tgc100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','facebook:seguidores','pacote','ff100','quantidade',100,'link','','ativo',false)
  )
),
updated_at = now()
where key = 'canary_config';