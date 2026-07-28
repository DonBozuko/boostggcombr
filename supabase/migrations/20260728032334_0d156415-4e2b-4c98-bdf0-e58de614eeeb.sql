REVOKE ALL ON FUNCTION public.log_catalog_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_catalog_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_catalog_changes() TO service_role;