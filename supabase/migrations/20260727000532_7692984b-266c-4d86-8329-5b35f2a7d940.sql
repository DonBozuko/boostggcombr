UPDATE admin_settings
SET value = jsonb_build_object(
  'enabled', true,
  'interval_hours', 12,
  'sla_hours', 6,
  'alvos', jsonb_build_array(
    jsonb_build_object('rede','instagram:seguidores','pacote','p100','quantidade',100,'link','https://instagram.com/fabiano_santiago_oficial','ativo',true),
    jsonb_build_object('rede','instagram:curtidas','pacote','l50','quantidade',50,'link','https://www.instagram.com/p/DZ8GjxRFCIw/','ativo',true),
    jsonb_build_object('rede','instagram:visualizacoes','pacote','v1k','quantidade',1000,'link','','ativo',false),
    jsonb_build_object('rede','instagram:seguidores:br','pacote','br-p100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','tiktok:seguidores','pacote','tf100','quantidade',100,'link','https://www.tiktok.com/@fabiano_santiago','ativo',true),
    jsonb_build_object('rede','tiktok:curtidas','pacote','tl100','quantidade',100,'link','https://www.tiktok.com/@fabiano_santiago/video/7488036804558425349','ativo',true),
    jsonb_build_object('rede','tiktok:visualizacoes','pacote','tv1k','quantidade',1000,'link','https://www.tiktok.com/@fabiano_santiago/video/7488036804558425349','ativo',true),
    jsonb_build_object('rede','youtube:inscritos','pacote','ys50','quantidade',50,'link','https://www.youtube.com/@DonBozuko','ativo',true),
    jsonb_build_object('rede','youtube:visualizacoes','pacote','yv1k','quantidade',1000,'link','https://www.youtube.com/watch?v=mMn0cVJ5-RY','ativo',true),
    jsonb_build_object('rede','kwai:seguidores','pacote','kf100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','telegram:canal','pacote','tgc100','quantidade',100,'link','','ativo',false),
    jsonb_build_object('rede','facebook:seguidores','pacote','ff100','quantidade',100,'link','','ativo',false)
  )
),
updated_at = now(),
updated_by = NULL
WHERE key = 'canary_config';