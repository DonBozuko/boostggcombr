-- Allow authenticated admin to read pedidos and jarvis_alerts for integrity checks
GRANT SELECT ON public.pedidos TO authenticated;
GRANT SELECT ON public.jarvis_alerts TO authenticated;

CREATE POLICY "Authenticated can read pedidos for admin audit"
  ON public.pedidos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read jarvis_alerts for admin audit"
  ON public.jarvis_alerts FOR SELECT TO authenticated USING (true);