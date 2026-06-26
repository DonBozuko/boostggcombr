
-- Strict RLS on jarvis_alerts: service_role only
ALTER TABLE public.jarvis_alerts ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing permissive policies
DROP POLICY IF EXISTS "Public read jarvis alerts" ON public.jarvis_alerts;
DROP POLICY IF EXISTS "Anyone can read jarvis alerts" ON public.jarvis_alerts;
DROP POLICY IF EXISTS "Service role manage jarvis alerts" ON public.jarvis_alerts;

-- Revoke any incidental grants from anon/authenticated
REVOKE ALL ON public.jarvis_alerts FROM anon;
REVOKE ALL ON public.jarvis_alerts FROM authenticated;

-- Service role keeps full access (bypasses RLS but explicit for clarity)
GRANT ALL ON public.jarvis_alerts TO service_role;

-- Single policy: only service_role
CREATE POLICY "Service role only access"
  ON public.jarvis_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
