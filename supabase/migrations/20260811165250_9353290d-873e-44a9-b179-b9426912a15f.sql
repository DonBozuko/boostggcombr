
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_director() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_director() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.ops_http_health(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_http_health(integer) TO service_role;
