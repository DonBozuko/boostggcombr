-- 1) Unique key para o auto-populador conseguir fazer upsert idempotente
ALTER TABLE public.service_id_matrix
  ADD CONSTRAINT service_id_matrix_natural_key_uq
  UNIQUE (network, service_type, min_qty, max_qty);

-- 2) Agenda sync diário do catálogo SMMhype (traz tudo + auto-popula matriz BR/mundial)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove agenda antiga se existir
DO $$ BEGIN
  PERFORM cron.unschedule('sync-smmhype-catalog-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'sync-smmhype-catalog-daily',
  '17 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/sync-services',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);