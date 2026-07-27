-- v293 — Blindagem dos robôs automáticos

-- 1) Crons com token em texto puro, timeout curto e domínio custom -> vault + 55s + URL estável
SELECT cron.alter_job(162, command := $cmd$SELECT net.http_post(url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/check-saldo', headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_ADMIN_TOKEN'),'Lovable-Context','cron'), body := '{}'::jsonb, timeout_milliseconds := 55000);$cmd$);
SELECT cron.alter_job(163, command := $cmd$SELECT net.http_post(url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/hooks/auto-healer', headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_ADMIN_TOKEN'),'Lovable-Context','cron'), body := '{}'::jsonb, timeout_milliseconds := 55000);$cmd$);
SELECT cron.alter_job(160, command := $cmd$SELECT net.http_post(url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/sync-smmpanel', headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_ADMIN_TOKEN'),'Lovable-Context','cron'), body := '{}'::jsonb, timeout_milliseconds := 55000);$cmd$);
SELECT cron.alter_job(161, command := $cmd$SELECT net.http_post(url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/sync-verified', headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_ADMIN_TOKEN'),'Lovable-Context','cron'), body := '{}'::jsonb, timeout_milliseconds := 55000);$cmd$);
SELECT cron.alter_job(182, command := $cmd$SELECT net.http_post(url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/sync-provider4', headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_ADMIN_TOKEN'),'Lovable-Context','cron'), body := '{}'::jsonb, timeout_milliseconds := 55000);$cmd$);

-- 2) sync-pricing duplicado (job 93 diario redundante com job 87 a cada 30min)
SELECT cron.unschedule(93);

-- 3) Vigia dos robos: net.http_post e fire-and-forget, cron.job_run_details sempre diz "succeeded".
--    Esta funcao le a resposta real e alerta em portugues, com dedupe e resolucao automatica.
CREATE OR REPLACE FUNCTION public.vigia_robos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  falhas int;
  total int;
  detalhe text;
  ja_aberto int;
BEGIN
  SELECT
    count(*) FILTER (WHERE status_code IS NULL OR status_code >= 400),
    count(*),
    string_agg(DISTINCT coalesce(status_code::text, 'sem resposta'), ', ')
      FILTER (WHERE status_code IS NULL OR status_code >= 400)
  INTO falhas, total, detalhe
  FROM net._http_response
  WHERE created > now() - interval '30 minutes';

  IF falhas >= 3 THEN
    SELECT count(*) INTO ja_aberto
    FROM public.alerts
    WHERE tipo = 'robos_sem_resposta'
      AND status = 'open'
      AND created_at > now() - interval '2 hours';

    IF ja_aberto = 0 THEN
      INSERT INTO public.alerts (tipo, nivel, mensagem, status)
      VALUES (
        'robos_sem_resposta',
        1,
        '⚠️ ROBÔS AUTOMÁTICOS FALHANDO' || chr(10) || chr(10) ||
        'PROBLEMA: ' || falhas || ' de ' || total || ' chamadas automáticas não responderam nos últimos 30 minutos (retorno: ' || coalesce(detalhe, 'sem resposta') || '). Atualização de preços, saldo e entrega podem estar atrasadas.' || chr(10) || chr(10) ||
        'O QUE FAZER: abra o painel admin e olhe o semáforo de saúde. Se estiver verde, foi oscilação passageira. Se este aviso voltar na próxima hora, o site pode estar fora do ar.',
        'open'
      );
    END IF;
  ELSIF falhas = 0 AND total > 0 THEN
    UPDATE public.alerts
       SET status = 'resolved'
     WHERE tipo = 'robos_sem_resposta'
       AND status = 'open';
  END IF;

  RETURN jsonb_build_object('falhas', falhas, 'total', total);
END;
$fn$;

REVOKE ALL ON FUNCTION public.vigia_robos() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('vigia-robos', '*/30 * * * *', $cmd$SELECT public.vigia_robos();$cmd$);