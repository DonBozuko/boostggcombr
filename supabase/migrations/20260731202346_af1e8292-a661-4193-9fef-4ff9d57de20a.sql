create or replace function public.ops_http_failure_shape(_minutes integer default 15)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','net'
as $function$
declare r jsonb;
begin
  select jsonb_build_object(
    'janela_minutos', _minutes,
    'erros_5xx', count(*),
    'minutos_distintos', count(distinct date_trunc('minute', created)),
    'primeiro', min(created),
    'ultimo', max(created)
  ) into r
  from net._http_response
  where created > now() - make_interval(mins => _minutes)
    and status_code >= 500;
  return coalesce(r, '{}'::jsonb);
exception when others then
  return jsonb_build_object('erro', SQLERRM);
end;
$function$;

revoke all on function public.ops_http_failure_shape(integer) from public, anon, authenticated;
grant execute on function public.ops_http_failure_shape(integer) to service_role;