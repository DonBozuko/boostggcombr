ALTER TABLE public.monitoramento_saldo
  ADD COLUMN IF NOT EXISTS saldo_brl numeric,
  ADD COLUMN IF NOT EXISTS cotacao_brl numeric;

COMMENT ON COLUMN public.monitoramento_saldo.saldo IS 'LEGADO: valor em USD. Use saldo_brl.';
COMMENT ON COLUMN public.monitoramento_saldo.saldo_brl IS 'Saldo em BRL (moeda unica do sistema).';