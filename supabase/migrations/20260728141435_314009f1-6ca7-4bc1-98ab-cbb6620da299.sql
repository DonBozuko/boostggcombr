SELECT cron.unschedule('bench-sweep-2h');

SELECT cron.schedule(
  'bench-sweep-2h',
  '17 */2 * * *',
  $$SELECT net.http_post(
      url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/hooks/bench-sweep',
      headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_ADMIN_TOKEN')),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );$$
);