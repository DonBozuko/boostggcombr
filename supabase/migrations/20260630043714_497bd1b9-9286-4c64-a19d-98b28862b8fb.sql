
-- pricing_items: revogar SELECT público e remover policy de leitura aberta
DROP POLICY IF EXISTS "pricing_items public read" ON public.pricing_items;
REVOKE SELECT ON public.pricing_items FROM anon, authenticated;

-- pricing_cache: mesma trava (custo por 1k não pode vazar)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='pricing_cache'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pricing_cache', pol.policyname);
  END LOOP;
END $$;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.pricing_cache FROM anon, authenticated;

-- Garantir que service_role mantém acesso total em ambas
GRANT ALL ON public.pricing_items TO service_role;
GRANT ALL ON public.pricing_cache TO service_role;

CREATE POLICY "pricing_items service all" ON public.pricing_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "pricing_cache service all" ON public.pricing_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
