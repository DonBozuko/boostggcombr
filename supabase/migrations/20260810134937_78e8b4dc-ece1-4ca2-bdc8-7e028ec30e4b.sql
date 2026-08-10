-- Final cleanup of RLS and Extension placement for pgvector
-- Move extension if allowed (standard Supabase practice)
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Re-verify RLS policies for memorias_sistema
-- The linter might be reporting cached results or specific rules.
-- We'll explicitly drop and recreate to be sure.

DROP POLICY IF EXISTS "Admins can select memories" ON public.memorias_sistema;
DROP POLICY IF EXISTS "Service role full access" ON public.memorias_sistema;

CREATE POLICY "Admins can select memories" ON public.memorias_sistema 
FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access" ON public.memorias_sistema 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

-- Ensure table is fully granted for the app data api
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorias_sistema TO authenticated;
GRANT ALL ON public.memorias_sistema TO service_role;
