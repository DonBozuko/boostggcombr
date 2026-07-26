-- v258 — Retenção de dados: evita crescimento infinito das tabelas de telemetria.
CREATE INDEX IF NOT EXISTS rate_limit_hits_created_idx
  ON public.rate_limit_hits USING btree (created_at);

CREATE OR REPLACE FUNCTION public.purge_telemetry_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb := '{}'::jsonb;
  n integer;
BEGIN
  DELETE FROM public.monitoramento_saldo WHERE data_hora < now() - interval '14 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('monitoramento_saldo', n);

  DELETE FROM public.page_views WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('page_views', n);

  DELETE FROM public.admin_audit_logs WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('admin_audit_logs', n);

  DELETE FROM public.webhook_events WHERE received_at < now() - interval '60 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('webhook_events', n);

  DELETE FROM public.checkout_attempts WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('checkout_attempts', n);

  DELETE FROM public.email_send_log WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('email_send_log', n);

  DELETE FROM public.jarvis_alerts WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('jarvis_alerts', n);

  DELETE FROM public.alerts WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('alerts', n);

  DELETE FROM public.rate_limit_hits WHERE created_at < now() - interval '1 day';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('rate_limit_hits', n);

  DELETE FROM public.auto_resolver_failures WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('auto_resolver_failures', n);

  INSERT INTO public.admin_audit_logs(admin_email, action, detail)
    VALUES ('system@retention', 'purge_telemetry_retention_v258', r);

  RETURN r;
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_telemetry_retention() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_telemetry_retention() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_telemetry_retention() TO service_role;

-- Rate limit: retirar o DELETE do caminho crítico de toda compra.
CREATE OR REPLACE FUNCTION public.rate_limit_check(_key text, _limit integer, _window_seconds integer)
RETURNS TABLE(allowed boolean, hits integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
BEGIN
  IF _key IS NULL OR length(trim(_key)) = 0 THEN
    RETURN QUERY SELECT true, 0, 0;
    RETURN;
  END IF;

  -- v258: limpeza probabilística (~2% das chamadas). Antes rodava em TODA
  -- requisição, gerando varredura + contenção de lock sob carga.
  IF random() < 0.02 THEN
    DELETE FROM public.rate_limit_hits
     WHERE created_at < now() - INTERVAL '1 hour';
  END IF;

  SELECT count(*), min(created_at) INTO v_count, v_oldest
    FROM public.rate_limit_hits
   WHERE bucket_key = _key
     AND created_at > now() - make_interval(secs => _window_seconds);

  IF v_count >= _limit THEN
    RETURN QUERY SELECT
      false,
      v_count,
      GREATEST(1, ceil(extract(epoch FROM (v_oldest + make_interval(secs => _window_seconds) - now())))::int);
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_hits(bucket_key) VALUES (_key);
  RETURN QUERY SELECT true, v_count + 1, 0;
END;
$function$;

SELECT cron.schedule(
  'purge-telemetry-daily',
  '25 4 * * *',
  $cron$ SELECT public.purge_telemetry_retention(); $cron$
);