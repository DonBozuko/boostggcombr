
DROP POLICY IF EXISTS "svc read authenticated smmpanel" ON public.smmpanel_services_cache;
DROP POLICY IF EXISTS "svc read authenticated verified" ON public.verified_services_cache;

REVOKE SELECT ON public.smmpanel_services_cache FROM authenticated;
REVOKE SELECT ON public.verified_services_cache FROM authenticated;
GRANT SELECT ON public.smmpanel_services_cache TO authenticated;
GRANT SELECT ON public.verified_services_cache TO authenticated;

CREATE POLICY "director read smmpanel cache"
  ON public.smmpanel_services_cache FOR SELECT
  TO authenticated
  USING (public.is_director());

CREATE POLICY "director read verified cache"
  ON public.verified_services_cache FOR SELECT
  TO authenticated
  USING (public.is_director());
