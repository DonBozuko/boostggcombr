UPDATE public.pedidos
   SET status = 'cancelled',
       error_detail = COALESCE(error_detail,'') || ' [teste de auditoria v643 — cobrança cancelada no gateway]'
 WHERE id IN ('5a91f9ab-bc91-4468-a174-0c733df1165f','8cba24b9-014a-4d6c-932e-fe24dcf7100f');