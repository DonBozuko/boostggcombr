
-- Explicit RESTRICTIVE deny policies for anon/authenticated on sensitive tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'admin_settings','pricing_cache','pricing_items','provider_rates_cache',
    'service_id_matrix','service_id_overrides','smmpanel_services_cache',
    'verified_services_cache','provider_health','scheduled_posts','virtual_wallets'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "deny_anon_all_%1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "deny_anon_all_%1$s" ON public.%1$I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)', t);
    EXECUTE format('DROP POLICY IF EXISTS "deny_authenticated_write_%1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "deny_authenticated_write_%1$s" ON public.%1$I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director())', t);
  END LOOP;
END $$;

-- pedidos_legacy: explicit deny for UPDATE and DELETE for anon/authenticated
DROP POLICY IF EXISTS "deny_anon_update_pedidos_legacy" ON public.pedidos_legacy;
CREATE POLICY "deny_anon_update_pedidos_legacy" ON public.pedidos_legacy AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_delete_pedidos_legacy" ON public.pedidos_legacy;
CREATE POLICY "deny_anon_delete_pedidos_legacy" ON public.pedidos_legacy AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);
