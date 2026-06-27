
DROP POLICY IF EXISTS "Authenticated can read pedidos for admin audit" ON public.pedidos;
DROP POLICY IF EXISTS "Deny public reads on pedidos" ON public.pedidos;
CREATE POLICY "Admin master reads pedidos" ON public.pedidos
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'fabiano.majestic@gmail.com');

DROP POLICY IF EXISTS "Authenticated can read jarvis_alerts for admin audit" ON public.jarvis_alerts;
CREATE POLICY "Admin master reads jarvis_alerts" ON public.jarvis_alerts
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'fabiano.majestic@gmail.com');
