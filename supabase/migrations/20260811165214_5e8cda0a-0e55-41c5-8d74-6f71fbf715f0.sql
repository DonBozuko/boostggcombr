
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorias_sistema TO authenticated;
GRANT ALL ON public.memorias_sistema TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_items TO authenticated;
GRANT ALL ON public.pricing_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
