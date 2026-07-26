-- v261 — Programa de Revenda (API)
CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  desconto_pct NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  saldo_brl NUMERIC(12,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resellers_desconto_ck CHECK (desconto_pct >= 0 AND desconto_pct <= 0.30),
  CONSTRAINT resellers_saldo_ck CHECK (saldo_brl >= 0)
);

GRANT ALL ON public.resellers TO service_role;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resellers_director_all" ON public.resellers FOR ALL TO authenticated
  USING (public.is_director()) WITH CHECK (public.is_director());

CREATE TABLE IF NOT EXISTS public.reseller_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  valor_brl NUMERIC(12,2) NOT NULL,
  saldo_depois NUMERIC(12,2),
  pedido_id UUID,
  detalhe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.reseller_ledger TO service_role;
ALTER TABLE public.reseller_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reseller_ledger_director_all" ON public.reseller_ledger FOR ALL TO authenticated
  USING (public.is_director()) WITH CHECK (public.is_director());

CREATE INDEX IF NOT EXISTS reseller_ledger_reseller_idx ON public.reseller_ledger(reseller_id, created_at DESC);

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS reseller_id UUID;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS reseller_valor NUMERIC(12,2);
CREATE INDEX IF NOT EXISTS pedidos_reseller_idx ON public.pedidos(reseller_id, created_at DESC);

-- Débito/crédito atômico do saldo do revendedor.
CREATE OR REPLACE FUNCTION public.reseller_balance_move(
  _reseller_id UUID,
  _amount NUMERIC,
  _tipo TEXT,
  _pedido_id UUID DEFAULT NULL,
  _detalhe TEXT DEFAULT NULL
) RETURNS TABLE(ok BOOLEAN, saldo NUMERIC, motivo TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE atual NUMERIC; novo NUMERIC;
BEGIN
  SELECT saldo_brl INTO atual FROM public.resellers WHERE id = _reseller_id FOR UPDATE;
  IF atual IS NULL THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'RESELLER_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  novo := round(atual + _amount, 2);
  IF novo < 0 THEN
    RETURN QUERY SELECT false, atual, 'INSUFFICIENT_BALANCE'::TEXT;
    RETURN;
  END IF;
  UPDATE public.resellers SET saldo_brl = novo, updated_at = now() WHERE id = _reseller_id;
  INSERT INTO public.reseller_ledger(reseller_id, tipo, valor_brl, saldo_depois, pedido_id, detalhe)
    VALUES (_reseller_id, _tipo, round(_amount, 2), novo, _pedido_id, _detalhe);
  RETURN QUERY SELECT true, novo, NULL::TEXT;
END; $$;

REVOKE ALL ON FUNCTION public.reseller_balance_move(UUID, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reseller_balance_move(UUID, NUMERIC, TEXT, UUID, TEXT) TO service_role;