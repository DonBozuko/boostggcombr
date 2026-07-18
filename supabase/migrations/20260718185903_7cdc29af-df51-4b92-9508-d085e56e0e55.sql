DROP POLICY IF EXISTS "Anyone can create a pedido" ON public.pedidos_legacy;
-- Trava explícita: nega INSERT para anon e authenticated (service_role continua liberado).
CREATE POLICY "deny_anon_insert_pedidos_legacy"
  ON public.pedidos_legacy
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);