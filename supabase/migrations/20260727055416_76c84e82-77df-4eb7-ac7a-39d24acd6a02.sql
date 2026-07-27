CREATE OR REPLACE FUNCTION public.solicitar_exclusao_pedido(_mp_id text, _client_ip text, _confirm text DEFAULT NULL)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pedido_id UUID; _c TEXT; _cdigits TEXT;
BEGIN
  IF _mp_id IS NULL OR length(trim(_mp_id)) < 4 THEN
    INSERT INTO public.lgpd_requests(mercado_pago_id, client_ip, outcome)
      VALUES (_mp_id, _client_ip, 'invalid_input');
    RETURN QUERY SELECT false, 'ID do pagamento inválido.'::TEXT;
    RETURN;
  END IF;

  _c := lower(trim(coalesce(_confirm, '')));
  _c := regexp_replace(_c, '^@', '');
  _cdigits := regexp_replace(_c, '\D', '', 'g');

  IF length(_c) < 3 THEN
    INSERT INTO public.lgpd_requests(mercado_pago_id, client_ip, outcome)
      VALUES (_mp_id, _client_ip, 'invalid_input');
    RETURN QUERY SELECT false, 'Informe também o @ do perfil, e-mail ou WhatsApp usado no pedido.'::TEXT;
    RETURN;
  END IF;

  -- v295: exige dupla confirmação (ID do pagamento + um dado de contato do pedido)
  UPDATE public.pedidos
     SET instagram_user = '[anonimizado-lgpd]',
         email_contato = NULL,
         whatsapp_contato = NULL
   WHERE mercado_pago_id = _mp_id
     AND instagram_user <> '[anonimizado-lgpd]'
     AND (
       lower(regexp_replace(coalesce(instagram_user, ''), '^@', '')) = _c
       OR lower(coalesce(email_contato, '')) = _c
       OR (length(_cdigits) >= 8 AND regexp_replace(coalesce(whatsapp_contato, ''), '\D', '', 'g') LIKE '%' || _cdigits)
     )
  RETURNING id INTO _pedido_id;

  IF _pedido_id IS NULL THEN
    INSERT INTO public.lgpd_requests(mercado_pago_id, client_ip, outcome)
      VALUES (_mp_id, _client_ip, 'not_found');
    RETURN QUERY SELECT false, 'Não encontramos um pedido com esse ID e esse dado de contato.'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.lgpd_requests(mercado_pago_id, pedido_id, client_ip, outcome)
    VALUES (_mp_id, _pedido_id, _client_ip, 'anonymized');
  RETURN QUERY SELECT true, 'Seus dados pessoais desse pedido foram removidos.'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_exclusao_pedido(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_exclusao_pedido(text, text, text) TO service_role;
DROP FUNCTION IF EXISTS public.solicitar_exclusao_pedido(text, text);