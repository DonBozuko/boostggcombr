DROP POLICY IF EXISTS "anon read service_id_overrides" ON public.service_id_overrides;
DROP POLICY IF EXISTS "public read overrides" ON public.service_id_overrides;
DROP POLICY IF EXISTS "anon select service_id_overrides" ON public.service_id_overrides;
REVOKE SELECT ON public.service_id_overrides FROM anon;