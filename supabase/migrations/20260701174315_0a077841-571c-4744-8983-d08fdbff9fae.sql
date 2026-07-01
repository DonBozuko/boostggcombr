
-- v116 Virtual Wallets
CREATE TABLE IF NOT EXISTS public.virtual_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  fornecedor_slug TEXT NULL,
  saldo_brl NUMERIC(14,4) NOT NULL DEFAULT 0,
  reserved_brl NUMERIC(14,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.virtual_wallets TO authenticated;
GRANT ALL ON public.virtual_wallets TO service_role;
ALTER TABLE public.virtual_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vw_director_read" ON public.virtual_wallets;
CREATE POLICY "vw_director_read" ON public.virtual_wallets FOR SELECT TO authenticated USING (public.is_director());

-- v116 Financial Ledger (Double-Entry, Imutável)
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ts_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  valor_brl NUMERIC(14,4) NOT NULL,
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  fornecedor_slug TEXT NULL,
  pedido_id UUID NULL,
  buyer_ip TEXT NULL,
  telemetry JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.financial_ledger TO authenticated;
GRANT ALL ON public.financial_ledger TO service_role;
REVOKE DELETE ON public.financial_ledger FROM authenticated, service_role, anon;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fl_director_read" ON public.financial_ledger;
CREATE POLICY "fl_director_read" ON public.financial_ledger FOR SELECT TO authenticated USING (public.is_director());
DROP POLICY IF EXISTS "fl_no_delete" ON public.financial_ledger;
CREATE POLICY "fl_no_delete" ON public.financial_ledger FOR DELETE TO authenticated USING (false);

-- Trigger de blindagem contra DELETE em qualquer contexto
CREATE OR REPLACE FUNCTION public.block_ledger_delete() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'financial_ledger é imutável: DELETE proibido';
END; $$;
DROP TRIGGER IF EXISTS trg_block_ledger_delete ON public.financial_ledger;
CREATE TRIGGER trg_block_ledger_delete BEFORE DELETE ON public.financial_ledger
  FOR EACH ROW EXECUTE FUNCTION public.block_ledger_delete();

CREATE INDEX IF NOT EXISTS idx_fl_pedido ON public.financial_ledger(pedido_id);
CREATE INDEX IF NOT EXISTS idx_fl_ts ON public.financial_ledger(ts_utc DESC);

-- Seed carteiras base
INSERT INTO public.virtual_wallets (wallet_key, label, fornecedor_slug) VALUES
  ('geral', 'Carteira Geral', NULL),
  ('reservado', 'Saldo Reservado', NULL),
  ('prov_smmhype', 'Carteira SMMHype', 'smmhype'),
  ('prov_smmpanel', 'Carteira SMMPanel', 'smmpanel'),
  ('prov_verified', 'Carteira Verified Atacado', 'verified')
ON CONFLICT (wallet_key) DO NOTHING;

-- RPC atômica: crédito com row-level lock (para uso do webhook via service_role)
CREATE OR REPLACE FUNCTION public.wallet_credit(_wallet_key TEXT, _amount NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo NUMERIC;
BEGIN
  PERFORM 1 FROM public.virtual_wallets WHERE wallet_key = _wallet_key FOR UPDATE;
  UPDATE public.virtual_wallets
    SET saldo_brl = saldo_brl + _amount, updated_at = now()
    WHERE wallet_key = _wallet_key
    RETURNING saldo_brl INTO novo;
  RETURN novo;
END; $$;
REVOKE ALL ON FUNCTION public.wallet_credit(TEXT, NUMERIC) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_credit(TEXT, NUMERIC) TO service_role;
