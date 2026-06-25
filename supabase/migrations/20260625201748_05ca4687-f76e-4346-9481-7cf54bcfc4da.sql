DROP POLICY IF EXISTS "public can read blocked flags" ON public.service_id_overrides;
REVOKE SELECT ON public.service_id_overrides FROM anon;