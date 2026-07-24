CREATE OR REPLACE FUNCTION public.ops_forensics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'cron', 'pgmq'
AS $function$
DECLARE
  res jsonb := '{}'::jsonb;
  v_crons jsonb; v_stuck jsonb; v_pix jsonb; v_email jsonb; v_caixa jsonb; v_catalog jsonb;
  v_queue jsonb := '{}'::jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'jobname'), '[]'::jsonb) INTO v_crons
  FROM (
    SELECT jsonb_build_object(
      'jobname', j.jobname, 'schedule', j.schedule, 'active', j.active,
      'last_start', r.start_time, 'last_status', r.status,
      'last_message', left(coalesce(r.return_message,''), 200),
      'stale_minutes', CASE WHEN r.start_time IS NULL THEN NULL
                            ELSE round(extract(epoch FROM (now() - r.start_time))/60)::int END
    ) AS x
    FROM cron.job j
    LEFT JOIN LATERAL (
      SELECT start_time, status, return_message FROM cron.job_run_details d
      WHERE d.jobid = j.jobid ORDER BY start_time DESC LIMIT 1
    ) r ON true
  ) s;

  -- v234: 'processing' só conta como problema se a entrega não avança há 12h
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'status', p.status, 'pacote', p.pacote, 'valor', p.valor,
    'provider_slug', p.provider_slug, 'provider_order_id', p.provider_order_id,
    'idade_horas', round(extract(epoch FROM (now()-p.created_at))/3600)::int,
    'faltam', p.last_remains,
    'detalhe', left(coalesce(p.error_detail,''),160)
  ) ORDER BY p.created_at), '[]'::jsonb) INTO v_stuck
  FROM public.pedidos p
  WHERE p.created_at < now() - interval '3 hours'
    AND (
      p.status IN ('paid','waiting_provision','MARGIN_HOLD','SMM_FAILED')
      OR (
        p.status = 'processing'
        AND coalesce(p.last_remains_at, p.dispatched_at, p.created_at) < now() - interval '12 hours'
      )
    );

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'pacote', p.pacote, 'valor', p.valor,
    'idade_horas', round(extract(epoch FROM (now()-p.created_at))/3600)::int,
    'email_recuperacao_enviado', p.recovery_email_sent_at IS NOT NULL
  ) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_pix
  FROM public.pedidos p
  WHERE p.status = 'pending' AND p.mercado_pago_id IS NOT NULL
    AND p.created_at > now() - interval '7 days'
    AND p.created_at < now() - interval '30 minutes';

  SELECT jsonb_build_object(
    'sent_24h', count(*) FILTER (WHERE status='sent'),
    'failed_24h', count(*) FILTER (WHERE status='failed'),
    'dlq_24h', count(*) FILTER (WHERE status='dlq'),
    'pending_travado', count(*) FILTER (WHERE status='pending' AND created_at < now() - interval '15 minutes')
  ) INTO v_email
  FROM public.email_send_log WHERE created_at > now() - interval '24 hours';

  BEGIN
    SELECT jsonb_build_object(
      'auth_emails', (SELECT count(*) FROM pgmq.q_auth_emails),
      'transactional_emails', (SELECT count(*) FROM pgmq.q_transactional_emails)
    ) INTO v_queue;
  EXCEPTION WHEN OTHERS THEN v_queue := jsonb_build_object('erro', SQLERRM);
  END;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'valor', p.valor, 'created_at', p.created_at
  ) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_caixa
  FROM public.pedidos p
  LEFT JOIN public.admin_treasury t ON t.pedido_id = p.id
  WHERE p.status IN ('completed','Enviado') AND t.pedido_id IS NULL
    AND p.created_at > now() - interval '30 days';

  SELECT jsonb_build_object(
    'total', count(*),
    'nao_vendaveis', count(*) FILTER (WHERE is_sellable IS FALSE),
    'sem_dry_run_7d', count(*) FILTER (WHERE last_dry_run IS NULL OR last_dry_run < now() - interval '7 days'),
    'exemplos_bloqueados', coalesce((
      SELECT jsonb_agg(jsonb_build_object('pacote', pi.pacote, 'motivo', pi.sellable_reason))
      FROM (SELECT pacote, sellable_reason FROM public.pricing_items WHERE is_sellable IS FALSE LIMIT 10) pi
    ), '[]'::jsonb)
  ) INTO v_catalog FROM public.pricing_items;

  res := jsonb_build_object(
    'generated_at', now(), 'crons', v_crons,
    'pedidos_pagos_sem_entrega', v_stuck, 'pix_pendente', v_pix,
    'email', v_email, 'email_queue_depth', v_queue,
    'vendas_sem_caixa', v_caixa, 'catalogo', v_catalog
  );
  RETURN res;
END;
$function$;