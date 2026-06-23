
DROP POLICY IF EXISTS "Permitir inserção pública de pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir leitura pública de pedidos" ON public.pedidos;

REVOKE ALL ON public.pedidos FROM anon, authenticated;

CREATE POLICY "Deny public reads on pedidos"
ON public.pedidos
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "Deny public inserts on pedidos"
ON public.pedidos
FOR INSERT
TO anon, authenticated
WITH CHECK (false);
