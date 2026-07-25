SELECT cron.unschedule('sync-provider4-5min');
SELECT cron.schedule('sync-provider4-5min','2-59/5 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/sync-provider4',
    headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_ADMIN_TOKEN')),
    body := '{}'::jsonb);
$cron$);