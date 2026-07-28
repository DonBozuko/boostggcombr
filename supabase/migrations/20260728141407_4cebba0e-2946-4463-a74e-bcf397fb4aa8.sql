SELECT cron.unschedule('bench-sweep-2h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bench-sweep-2h');

SELECT cron.schedule(
  'bench-sweep-2h',
  '17 */2 * * *',
  $$SELECT net.http_post(
      url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/hooks/bench-sweep',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );$$
);