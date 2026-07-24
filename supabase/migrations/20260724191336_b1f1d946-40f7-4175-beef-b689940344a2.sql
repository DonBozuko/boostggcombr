DO $$
DECLARE
  v_key TEXT;
  v_base TEXT := 'https://www.boostgg.com.br';
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'email_queue_service_role_key ausente no vault';
  END IF;

  BEGIN PERFORM cron.unschedule('sync-smmpanel-5min'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('sync-verified-5min'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('check-smmhype-saldo'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('auto-healer-5min'); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule('sync-smmpanel-5min', '1-59/5 * * * *', format($cron$
    SELECT net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','Lovable-Context','cron'),
      body := '{}'::jsonb);
  $cron$, v_base || '/api/public/sync-smmpanel', v_key));

  PERFORM cron.schedule('sync-verified-5min', '2-59/5 * * * *', format($cron$
    SELECT net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','Lovable-Context','cron'),
      body := '{}'::jsonb);
  $cron$, v_base || '/api/public/sync-verified', v_key));

  PERFORM cron.schedule('check-smmhype-saldo', '3-59/5 * * * *', format($cron$
    SELECT net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','Lovable-Context','cron'),
      body := '{}'::jsonb);
  $cron$, v_base || '/api/public/check-saldo', v_key));

  PERFORM cron.schedule('auto-healer-5min', '*/5 * * * *', format($cron$
    SELECT net.http_post(url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','Lovable-Context','cron'),
      body := '{}'::jsonb);
  $cron$, v_base || '/api/public/hooks/auto-healer', v_key));
END $$;