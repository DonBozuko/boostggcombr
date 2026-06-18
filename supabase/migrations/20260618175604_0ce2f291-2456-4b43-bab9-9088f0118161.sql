CREATE POLICY "Deny all public reads on pedidos"
ON public.pedidos
FOR SELECT
TO anon, authenticated
USING (false);

REVOKE SELECT ON public.pedidos FROM anon, authenticated;