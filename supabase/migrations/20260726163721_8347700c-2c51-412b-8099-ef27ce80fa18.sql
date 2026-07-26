ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS metodo_pagamento text NOT NULL DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS mp_preference_id text;

CREATE INDEX IF NOT EXISTS idx_pedidos_mp_preference_id
  ON public.pedidos (mp_preference_id)
  WHERE mp_preference_id IS NOT NULL;