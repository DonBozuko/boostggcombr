CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pacote_selecionado TEXT NOT NULL,
  link_instagram TEXT NOT NULL,
  whatsapp_contato TEXT NOT NULL,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente'
);

GRANT INSERT ON public.pedidos TO anon;
GRANT INSERT ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a pedido"
ON public.pedidos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);