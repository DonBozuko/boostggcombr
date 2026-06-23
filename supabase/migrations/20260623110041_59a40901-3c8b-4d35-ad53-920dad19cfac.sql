
DROP POLICY IF EXISTS "Anyone can create pedido" ON public.pedidos;
DROP POLICY IF EXISTS "Deny public reads on pedidos" ON public.pedidos;

CREATE POLICY "Permitir inserção pública de pedidos"
ON public.pedidos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir leitura pública de pedidos"
ON public.pedidos
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT, INSERT ON public.pedidos TO anon;
GRANT SELECT, INSERT ON public.pedidos TO authenticated;
