DELETE FROM public.bench_findings WHERE pacote LIKE 'wbr%';
DELETE FROM public.catalog_changes WHERE pacote LIKE 'wbr%';
DELETE FROM public.service_fingerprints WHERE pacote LIKE 'wbr%';
DELETE FROM public.canary_quarantine WHERE pacote LIKE 'wbr%';
DELETE FROM public.canary_runs WHERE pacote LIKE 'wbr%';
DELETE FROM public.auto_resolver_failures WHERE pacote LIKE 'wbr%';
DELETE FROM public.pricing_items WHERE category = 'trafego:br' OR pacote LIKE 'wbr%';

ALTER TABLE public.pricing_items
  ADD CONSTRAINT pricing_items_no_trafego_br
  CHECK (category <> 'trafego:br' AND pacote NOT LIKE 'wbr%');