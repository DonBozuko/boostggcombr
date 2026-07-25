ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS moeda TEXT NOT NULL DEFAULT 'USD';
UPDATE public.fornecedores SET moeda = 'BRL' WHERE lower(slug) IN ('smmpainel','smmpanel','verified','provider4');
UPDATE public.fornecedores SET moeda = 'USD' WHERE lower(slug) = 'smmhype';
UPDATE public.fornecedores SET saldo_atual = round((saldo_atual / NULLIF(cotacao_brl,0))::numeric, 2) WHERE lower(slug) = 'provider4' AND saldo_atual > 40;