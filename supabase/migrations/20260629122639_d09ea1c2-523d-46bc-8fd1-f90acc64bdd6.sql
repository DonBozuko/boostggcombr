
REVOKE EXECUTE ON FUNCTION public.is_director() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_director() TO authenticated, service_role;
