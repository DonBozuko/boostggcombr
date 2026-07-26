ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS reseller_idem_key text;

CREATE UNIQUE INDEX IF NOT EXISTS pedidos_reseller_idem_key_uidx
  ON public.pedidos (reseller_idem_key)
  WHERE reseller_idem_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reseller_refund_pedido(_pedido_id uuid, _motivo text DEFAULT NULL)
RETURNS TABLE(ok boolean, saldo numeric, motivo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reseller uuid;
  v_valor numeric;
  v_atual numeric;
  v_novo numeric;
BEGIN
  SELECT p.reseller_id, round(coalesce(p.reseller_valor, p.valor, 0), 2)
    INTO v_reseller, v_valor
  FROM public.pedidos p
  WHERE p.id = _pedido_id;

  IF v_reseller IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 'NAO_E_REVENDA'::text;
    RETURN;
  END IF;

  IF v_valor IS NULL OR v_valor <= 0 THEN
    RETURN QUERY SELECT false, 0::numeric, 'VALOR_INVALIDO'::text;
    RETURN;
  END IF;

  -- Trava a carteira: serializa devoluções concorrentes do mesmo revendedor.
  SELECT r.saldo_brl INTO v_atual
  FROM public.resellers r
  WHERE r.id = v_reseller
  FOR UPDATE;

  IF v_atual IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 'RESELLER_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Idempotência: já devolvido para este pedido → não credita de novo.
  IF EXISTS (
    SELECT 1 FROM public.reseller_ledger l
    WHERE l.pedido_id = _pedido_id AND l.tipo = 'refund'
  ) THEN
    RETURN QUERY SELECT true, v_atual, 'JA_DEVOLVIDO'::text;
    RETURN;
  END IF;

  v_novo := round(v_atual + v_valor, 2);

  UPDATE public.resellers
     SET saldo_brl = v_novo, updated_at = now()
   WHERE id = v_reseller;

  INSERT INTO public.reseller_ledger(reseller_id, tipo, valor_brl, saldo_depois, pedido_id, detalhe)
  VALUES (v_reseller, 'refund', v_valor, v_novo, _pedido_id,
          coalesce(_motivo, 'devolucao automatica de pedido nao entregue'));

  RETURN QUERY SELECT true, v_novo, NULL::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.reseller_refund_pedido(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reseller_refund_pedido(uuid, text) TO service_role;