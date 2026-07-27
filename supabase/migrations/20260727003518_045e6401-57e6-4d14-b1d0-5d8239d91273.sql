UPDATE admin_settings
SET value = jsonb_set(
  value,
  '{alvos,11}',
  '{"ativo":true,"link":"https://www.facebook.com/fabianosantiago.9779","pacote":"ff100","quantidade":100,"rede":"facebook:seguidores"}'::jsonb,
  false
),
updated_at = now()
WHERE key = 'canary_config';