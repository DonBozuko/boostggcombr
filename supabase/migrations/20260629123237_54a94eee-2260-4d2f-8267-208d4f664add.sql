
-- 1) Lock down SECURITY DEFINER function: only service_role may EXECUTE
REVOKE EXECUTE ON FUNCTION public.is_director() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_director() TO service_role;

-- 2) admin_treasury: explicit RESTRICTIVE deny of writes for anon/authenticated
DROP POLICY IF EXISTS "deny_write_anon_authenticated" ON public.admin_treasury;
CREATE POLICY "deny_write_anon_authenticated"
ON public.admin_treasury
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Explicit service_role full access (permissive)
DROP POLICY IF EXISTS "service_role_full_access" ON public.admin_treasury;
CREATE POLICY "service_role_full_access"
ON public.admin_treasury
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3) connection_tests: make intent explicit — only service_role
DROP POLICY IF EXISTS "deny_all_anon_authenticated" ON public.connection_tests;
CREATE POLICY "deny_all_anon_authenticated"
ON public.connection_tests
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_full_access" ON public.connection_tests;
CREATE POLICY "service_role_full_access"
ON public.connection_tests
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4) pedidos: explicit RESTRICTIVE deny on INSERT/UPDATE/DELETE for anon and authenticated
DROP POLICY IF EXISTS "deny_writes_anon_authenticated" ON public.pedidos;
CREATE POLICY "deny_writes_anon_authenticated"
ON public.pedidos
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_full_access" ON public.pedidos;
CREATE POLICY "service_role_full_access"
ON public.pedidos
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
