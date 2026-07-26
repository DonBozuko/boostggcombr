CREATE OR REPLACE FUNCTION public.purge_telemetry_retention()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb := '{}'::jsonb;
  n integer;
  t record;
BEGIN
  -- v276: cada tabela em bloco próprio. Antes, um único erro (coluna
  -- inexistente em auto_resolver_failures) abortava a função inteira e a
  -- retenção NUNCA rodava -> crescimento infinito de telemetria.
  FOR t IN
    SELECT * FROM (VALUES
      ('monitoramento_saldo','data_hora','14 days'),
      ('page_views','created_at','180 days'),
      ('admin_audit_logs','created_at','90 days'),
      ('webhook_events','received_at','60 days'),
      ('checkout_attempts','created_at','180 days'),
      ('email_send_log','created_at','90 days'),
      ('jarvis_alerts','created_at','60 days'),
      ('alerts','created_at','60 days'),
      ('rate_limit_hits','created_at','1 day'),
      ('auto_resolver_failures','last_failed_at','60 days')
    ) AS v(tbl, col, keep)
  LOOP
    BEGIN
      EXECUTE format(
        'DELETE FROM public.%I WHERE %I < now() - %L::interval',
        t.tbl, t.col, t.keep
      );
      GET DIAGNOSTICS n = ROW_COUNT;
      r := r || jsonb_build_object(t.tbl, n);
    EXCEPTION WHEN OTHERS THEN
      r := r || jsonb_build_object(t.tbl, 'erro: ' || SQLERRM);
    END;
  END LOOP;

  BEGIN
    INSERT INTO public.admin_audit_logs(admin_email, action, detail)
      VALUES ('system@retention', 'purge_telemetry_retention_v276', r);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN r;
END;
$function$;