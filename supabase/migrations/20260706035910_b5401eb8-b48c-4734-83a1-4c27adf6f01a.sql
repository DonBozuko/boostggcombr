
-- 1) Auditoria de solicitações LGPD
CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mercado_pago_id TEXT,
  pedido_id UUID,
  client_ip TEXT,
  outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.lgpd_requests TO service_role;
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lgpd_requests director read" ON public.lgpd_requests
  FOR SELECT TO authenticated USING (public.is_director());

-- 2) Anonimização em lote (retenção 5 anos)
CREATE OR REPLACE FUNCTION public.anonimizar_pedidos_antigos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE afetados INTEGER;
BEGIN
  UPDATE public.pedidos
     SET instagram_user = '[anonimizado-lgpd]',
         whatsapp_contato = NULL
   WHERE created_at < now() - INTERVAL '5 years'
     AND instagram_user <> '[anonimizado-lgpd]';
  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados;
END; $$;

-- 3) Auto-exclusão pelo próprio cliente (via mercado_pago_id como prova)
CREATE OR REPLACE FUNCTION public.solicitar_exclusao_pedido(
  _mp_id TEXT,
  _client_ip TEXT DEFAULT NULL
)
RETURNS TABLE(ok BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pedido_id UUID;
BEGIN
  IF _mp_id IS NULL OR length(trim(_mp_id)) < 4 THEN
    INSERT INTO public.lgpd_requests(mercado_pago_id, client_ip, outcome)
      VALUES (_mp_id, _client_ip, 'invalid_input');
    RETURN QUERY SELECT false, 'ID do pagamento inválido.'::TEXT;
    RETURN;
  END IF;

  UPDATE public.pedidos
     SET instagram_user = '[anonimizado-lgpd]',
         whatsapp_contato = NULL
   WHERE mercado_pago_id = _mp_id
     AND instagram_user <> '[anonimizado-lgpd]'
  RETURNING id INTO _pedido_id;

  IF _pedido_id IS NULL THEN
    INSERT INTO public.lgpd_requests(mercado_pago_id, client_ip, outcome)
      VALUES (_mp_id, _client_ip, 'not_found');
    RETURN QUERY SELECT false, 'Nenhum pedido encontrado com esse ID.'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.lgpd_requests(mercado_pago_id, pedido_id, client_ip, outcome)
    VALUES (_mp_id, _pedido_id, _client_ip, 'anonymized');
  RETURN QUERY SELECT true, 'Seus dados pessoais desse pedido foram removidos.'::TEXT;
END; $$;

REVOKE ALL ON FUNCTION public.solicitar_exclusao_pedido(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_exclusao_pedido(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonimizar_pedidos_antigos() TO service_role;

-- 4) Cron mensal
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('lgpd-retention-monthly') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'lgpd-retention-monthly'
    );
    PERFORM cron.schedule(
      'lgpd-retention-monthly',
      '0 3 1 * *',
      $cron$ SELECT public.anonimizar_pedidos_antigos(); $cron$
    );
  END IF;
END $$;
