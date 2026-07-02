CREATE UNIQUE INDEX IF NOT EXISTS pedidos_mercado_pago_id_uniq
  ON public.pedidos (mercado_pago_id)
  WHERE mercado_pago_id IS NOT NULL;