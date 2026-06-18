DROP POLICY "Anyone can create a pedido" ON public.pedidos;

CREATE POLICY "Anyone can create a pedido"
ON public.pedidos
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(pacote_selecionado) BETWEEN 1 AND 50
  AND char_length(link_instagram) BETWEEN 2 AND 200
  AND char_length(whatsapp_contato) BETWEEN 5 AND 50
  AND status_pagamento = 'pendente'
);