DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'CRON_ADMIN_TOKEN') THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'CRON_ADMIN_TOKEN');
  END IF;
END $$;

SELECT cron.unschedule('auto-healer-core-v172')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-healer-core-v172');

SELECT cron.schedule(
  'auto-healer-core-v172',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://eliteboostprime.lovable.app/api/public/hooks/auto-healer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_ADMIN_TOKEN' LIMIT 1)
    ),
    body := '{"source":"cron","version":"v172"}'::jsonb
  ) AS request_id;
  $cron$
);