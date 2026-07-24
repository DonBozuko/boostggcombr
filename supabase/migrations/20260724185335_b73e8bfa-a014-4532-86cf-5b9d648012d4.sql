ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS last_remains integer,
  ADD COLUMN IF NOT EXISTS last_remains_at timestamptz;