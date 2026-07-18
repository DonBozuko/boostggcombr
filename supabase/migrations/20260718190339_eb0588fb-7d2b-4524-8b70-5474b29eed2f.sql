-- Permite que o diretor leia alerts (necessário para o Realtime entregar eventos no painel admin)
DROP POLICY IF EXISTS "deny_auth_all_alerts" ON public.alerts;
CREATE POLICY "deny_auth_write_alerts" ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "deny_auth_update_alerts" ON public.alerts
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "deny_auth_delete_alerts" ON public.alerts
  FOR DELETE TO authenticated USING (false);
CREATE POLICY "alerts_director_read" ON public.alerts
  FOR SELECT TO authenticated USING (public.is_director());