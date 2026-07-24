UPDATE public.pedidos
SET provider_slug='verified', provider_order_id='12118915', dispatched_at=now(), status='processing'
WHERE id='c0d7567f-b73f-43ea-9f38-02bd264b10c5';