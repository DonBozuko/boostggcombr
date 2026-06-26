DROP POLICY IF EXISTS "Public read jarvis alerts" ON public.jarvis_alerts;
REVOKE SELECT ON public.jarvis_alerts FROM anon;