
-- connection_tests: lock down to service_role only
DROP POLICY IF EXISTS "Anyone can insert connection tests" ON public.connection_tests;
DROP POLICY IF EXISTS "Anyone can read connection tests" ON public.connection_tests;
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.connection_tests FROM anon, authenticated;

-- fornecedores: explicit restrictive deny for UPDATE/DELETE on public roles
CREATE POLICY "deny_anon_update_fornecedores" ON public.fornecedores AS RESTRICTIVE FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_delete_fornecedores" ON public.fornecedores AS RESTRICTIVE FOR DELETE TO anon USING (false);
CREATE POLICY "deny_auth_update_fornecedores" ON public.fornecedores AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_auth_delete_fornecedores" ON public.fornecedores AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
