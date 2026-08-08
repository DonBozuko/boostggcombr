-- v585: Restrição de acesso ao RPC de preços.
-- O linter v584 detectou que a função estava exposta a anon/authenticated.
-- Apenas o service_role (backend/supabaseAdmin) deve ter permissão de execução.

REVOKE ALL ON FUNCTION public.bulk_update_pricing(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bulk_update_pricing(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.bulk_update_pricing(jsonb) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.bulk_update_pricing(jsonb) TO service_role;