ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS rede_social text NOT NULL DEFAULT 'instagram';
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS rede_social text NOT NULL DEFAULT 'instagram';
CREATE INDEX IF NOT EXISTS idx_pedidos_rede_social ON public.pedidos(rede_social);
CREATE INDEX IF NOT EXISTS idx_fornecedores_rede_social ON public.fornecedores(rede_social);