
-- Explicit DENY policies for admin-only tables.
-- service_role bypasses RLS, so server code keeps working.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fornecedores','alerts','bank_accounts','suppliers'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "deny_anon_all_%1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "deny_auth_all_%1$s" ON public.%1$I', t);

    EXECUTE format(
      'CREATE POLICY "deny_anon_all_%1$s" ON public.%1$I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)', t);
    EXECUTE format(
      'CREATE POLICY "deny_auth_all_%1$s" ON public.%1$I AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false)', t);
  END LOOP;
END $$;
