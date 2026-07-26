UPDATE public.pedidos
SET status = 'expired',
    error_detail = COALESCE(error_detail, 'Pix não pago em 24h (limpeza v260)')
WHERE status IN ('pending','mp_pending','mp_in_process')
  AND created_at < now() - interval '24 hours';