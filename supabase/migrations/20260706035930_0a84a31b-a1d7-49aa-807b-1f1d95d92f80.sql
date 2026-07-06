
REVOKE EXECUTE ON FUNCTION public.solicitar_exclusao_pedido(TEXT, TEXT) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.anonimizar_pedidos_antigos() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_exclusao_pedido(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonimizar_pedidos_antigos() TO service_role;
