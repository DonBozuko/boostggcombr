REVOKE ALL ON FUNCTION public.ops_forensics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_forensics() TO service_role;
REVOKE ALL ON FUNCTION public.ops_http_health(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_http_health(integer) TO service_role;