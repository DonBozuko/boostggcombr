DROP POLICY IF EXISTS "Authenticated insert jarvis alerts" ON public.jarvis_alerts;
REVOKE INSERT ON public.jarvis_alerts FROM authenticated;