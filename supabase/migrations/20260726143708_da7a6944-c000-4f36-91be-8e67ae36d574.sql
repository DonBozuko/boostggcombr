
CREATE TABLE public.afiliados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  whatsapp text,
  codigo text NOT NULL UNIQUE,
  comissao_pct numeric(5,4) NOT NULL DEFAULT 0.10,
  saldo_brl numeric(12,2) NOT NULL DEFAULT 0,
  total_ganho numeric(12,2) NOT NULL DEFAULT 0,
  pago_brl numeric(12,2) NOT NULL DEFAULT 0,
  pix_chave text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.afiliados TO service_role;
ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "afiliados_director_all" ON public.afiliados FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

CREATE TABLE public.afiliado_comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id uuid NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
  pedido_id uuid NOT NULL UNIQUE,
  valor_pedido numeric(12,2) NOT NULL,
  comissao_brl numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'liberada',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.afiliado_comissoes TO service_role;
ALTER TABLE public.afiliado_comissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "afiliado_comissoes_director_all" ON public.afiliado_comissoes FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());
CREATE INDEX idx_afiliado_comissoes_afiliado ON public.afiliado_comissoes(afiliado_id, created_at DESC);

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS affiliate_code text;
CREATE INDEX IF NOT EXISTS idx_pedidos_affiliate_code ON public.pedidos(affiliate_code) WHERE affiliate_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.afiliado_credit(_afiliado_id uuid, _pedido_id uuid, _valor_pedido numeric, _comissao numeric)
RETURNS TABLE(ok boolean, saldo numeric, motivo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE novo numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.afiliado_comissoes WHERE pedido_id = _pedido_id) THEN
    RETURN QUERY SELECT false, 0::numeric, 'JA_CREDITADO'::text;
    RETURN;
  END IF;
  PERFORM 1 FROM public.afiliados WHERE id = _afiliado_id FOR UPDATE;
  INSERT INTO public.afiliado_comissoes(afiliado_id, pedido_id, valor_pedido, comissao_brl)
    VALUES (_afiliado_id, _pedido_id, round(_valor_pedido,2), round(_comissao,2));
  UPDATE public.afiliados
     SET saldo_brl = round(saldo_brl + _comissao, 2),
         total_ganho = round(total_ganho + _comissao, 2),
         updated_at = now()
   WHERE id = _afiliado_id
   RETURNING saldo_brl INTO novo;
  RETURN QUERY SELECT true, novo, NULL::text;
EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT false, 0::numeric, 'JA_CREDITADO'::text;
END; $$;
