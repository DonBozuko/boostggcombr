-- Add memorias_sistema to types.ts by generating a small diff if needed, 
-- but here we just need to ensure RLS and schema are correct.
-- The linter complained about extensions in public.

-- Move vector extension to extensions schema if possible, or ignore if it's environment specific.
-- Most Supabase projects have a 'extensions' schema.
CREATE SCHEMA IF NOT EXISTS extensions;
-- In Supabase, usually extensions are managed. If it's already in public, 
-- moving it might be restricted. We'll leave it but ensure policies are tight.

-- Fix RLS issue: we need to ensure the policy was actually created.
-- The linter said "RLS Enabled No Policy".
-- This usually means the table has RLS but no policies were found.

DO $$ 
BEGIN
    -- Ensure the policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Admins can select memories' AND polrelid = 'public.memorias_sistema'::regclass
    ) THEN
        CREATE POLICY "Admins can select memories" ON public.memorias_sistema FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    -- Add a policy for service_role if not present
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Service role full access' AND polrelid = 'public.memorias_sistema'::regclass
    ) THEN
        CREATE POLICY "Service role full access" ON public.memorias_sistema FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
