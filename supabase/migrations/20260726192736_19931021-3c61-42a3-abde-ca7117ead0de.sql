CREATE OR REPLACE FUNCTION public.anonimizar_pedidos_antigos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE afetados INTEGER;
BEGIN
  UPDATE public.pedidos
     SET instagram_user = '[anonimizado-lgpd]',
         email_contato = NULL
   WHERE created_at < now() - INTERVAL '5 years'
     AND instagram_user <> '[anonimizado-lgpd]';
  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados;
END; $function$;

CREATE OR REPLACE FUNCTION public.solicitar_exclusao_pedido(_mp_id text, _client_ip text DEFAULT NULL::text)
 RETURNS TABLE(ok boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         email_contato = NULL
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
END; $function$;