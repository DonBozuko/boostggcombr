
DO $$
DECLARE
  v_key TEXT;
  v_base TEXT := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app';
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'email_queue_service_role_key ausente no vault — abortando agendamento';
  END IF;

  -- Limpa duplicatas antigas
  BEGIN PERFORM cron.unschedule('pedido-reconciler-5min'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('recovery-scan-15min');     EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('sla-watcher-10min');       EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule(
    'pedido-reconciler-5min',
    '*/5 * * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','Lovable-Context','cron'),
        body := '{}'::jsonb
      );
    $cron$, v_base || '/api/public/hooks/pedido-reconciler', v_key)
  );

  PERFORM cron.schedule(
    'recovery-scan-15min',
    '*/15 * * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','Lovable-Context','cron'),
        body := '{}'::jsonb
      );
    $cron$, v_base || '/api/public/hooks/recovery-scan', v_key)
  );

  PERFORM cron.schedule(
    'sla-watcher-10min',
    '*/10 * * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','Lovable-Context','cron'),
        body := '{}'::jsonb
      );
    $cron$, v_base || '/api/public/hooks/sla-watcher', v_key)
  );
END $$;
