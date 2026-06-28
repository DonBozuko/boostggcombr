DROP POLICY IF EXISTS "public read sandbox flag" ON public.admin_settings;
DROP POLICY IF EXISTS "Deny public inserts on pedidos" ON public.pedidos;
REVOKE INSERT ON public.pedidos FROM anon, authenticated;