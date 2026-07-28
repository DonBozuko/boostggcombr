
-- Deny-anon restritivo (defesa em profundidade)
CREATE POLICY "afiliados_deny_anon" ON public.afiliados AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "resellers_deny_anon" ON public.resellers AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "reseller_ledger_deny_anon" ON public.reseller_ledger AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- Solicitações de revenda: nenhuma escrita direta do cliente (só server/service_role)
CREATE POLICY "reseller_applications_deny_anon" ON public.reseller_applications AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "reseller_applications_deny_client_writes" ON public.reseller_applications AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_director()) WITH CHECK (false);

-- Bancada de provas: leitura só para diretoria, escrita só pelo servidor
CREATE POLICY "bench_runs_director_read" ON public.bench_runs FOR SELECT TO authenticated USING (public.is_director());
CREATE POLICY "bench_runs_deny_anon" ON public.bench_runs AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "bench_findings_director_read" ON public.bench_findings FOR SELECT TO authenticated USING (public.is_director());
CREATE POLICY "bench_findings_deny_anon" ON public.bench_findings AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

GRANT SELECT ON public.bench_runs TO authenticated;
GRANT SELECT ON public.bench_findings TO authenticated;
GRANT ALL ON public.bench_runs TO service_role;
GRANT ALL ON public.bench_findings TO service_role;
