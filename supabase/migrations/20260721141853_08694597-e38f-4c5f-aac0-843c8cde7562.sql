SELECT cron.unschedule('monthly-backup-drill');
SELECT cron.schedule(
  'monthly-backup-drill',
  '0 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/hooks/backup-drill',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);