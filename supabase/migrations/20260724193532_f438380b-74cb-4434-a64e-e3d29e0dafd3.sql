CREATE OR REPLACE FUNCTION public.ops_http_health(_hours int DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  r jsonb;
  v_cutoff timestamptz;
BEGIN
  SELECT greatest(
    now() - make_interval(hours => _hours),
    coalesce((
      SELECT max(created_at)
      FROM public.admin_audit_logs
      WHERE action = 'cron_routes_fixed_v235'
    ), '-infinity'::timestamptz)
  ) INTO v_cutoff;

  SELECT jsonb_build_object(
    'janela_horas', _hours,
    'desde', v_cutoff,
    'ok_200', count(*) FILTER (WHERE status_code BETWEEN 200 AND 299),
    'nao_encontrado_404', count(*) FILTER (WHERE status_code = 404),
    'sem_permissao_401_403', count(*) FILTER (WHERE status_code IN (401,403)),
    'erro_servidor_5xx', count(*) FILTER (WHERE status_code >= 500),
    'timeout_ou_rede', count(*) FILTER (WHERE status_code IS NULL)
  ) INTO r
  FROM net._http_response
  WHERE created > v_cutoff;

  RETURN coalesce(r, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('erro', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_http_health(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_http_health(int) TO service_role;

INSERT INTO public.admin_audit_logs (admin_email, action, detail, created_at)
VALUES (
  'system@ops-audit',
  'cron_routes_fixed_v235',
  jsonb_build_object(
    'motivo', 'Ignorar erros 404/401 antigos depois da correção dos endereços dos robôs',
    'observacao', 'A auditoria passa a olhar só erros novos depois desta marcação'
  ),
  now()
);

UPDATE public.jarvis_alerts
SET severidade = 'warning',
    mensagem = '✅ RESOLVIDO — ' || mensagem
WHERE id IN (
  'cca8884d-143d-4334-a119-0fb3cb649dd1',
  '76a0f4a7-b84d-46c3-8848-45f58a91e0e3',
  '92ac68ff-fcee-4190-954e-97012889a1c7'
)
AND severidade = 'critical';