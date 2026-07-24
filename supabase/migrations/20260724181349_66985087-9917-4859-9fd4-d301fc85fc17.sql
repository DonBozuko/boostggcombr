CREATE OR REPLACE FUNCTION public.ops_http_health(_hours int DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'janela_horas', _hours,
    'ok_200', count(*) FILTER (WHERE status_code BETWEEN 200 AND 299),
    'nao_encontrado_404', count(*) FILTER (WHERE status_code = 404),
    'sem_permissao_401_403', count(*) FILTER (WHERE status_code IN (401,403)),
    'erro_servidor_5xx', count(*) FILTER (WHERE status_code >= 500),
    'timeout_ou_rede', count(*) FILTER (WHERE status_code IS NULL)
  ) INTO r
  FROM net._http_response
  WHERE created > now() - make_interval(hours => _hours);
  RETURN coalesce(r, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('erro', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_http_health(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_http_health(int) TO service_role;