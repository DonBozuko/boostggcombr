INSERT INTO public.admin_settings (key, value)
VALUES (
  'ads_hardware_pause',
  jsonb_build_object(
    'active', true,
    'reason', 'Aguardando chegada de celular e chip novos para reativar campanhas com segurança.',
    'created_at', now()
  )
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
