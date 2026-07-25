CREATE OR REPLACE FUNCTION public.ops_http_recent_failures(_minutes integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
DECLARE r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'janela_minutos', _minutes,
    'nao_encontrado_404', count(*) FILTER (WHERE status_code = 404),
    'sem_permissao_401_403', count(*) FILTER (WHERE status_code IN (401,403)),
    'erro_servidor_5xx', count(*) FILTER (WHERE status_code >= 500),
    'ok_200', count(*) FILTER (WHERE status_code BETWEEN 200 AND 299)
  ) INTO r
  FROM net._http_response
  WHERE created > now() - make_interval(mins => _minutes);
  RETURN coalesce(r, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('erro', SQLERRM);
END;
$function$;
REVOKE ALL ON FUNCTION public.ops_http_recent_failures(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_http_recent_failures(integer) TO service_role;