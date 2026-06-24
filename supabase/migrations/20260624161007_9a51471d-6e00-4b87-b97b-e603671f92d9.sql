
-- Passo 2: Normalização da tabela de fornecedores
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS prioridade INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT false;

-- Backfill slug a partir do nome (lowercase, sem espaços)
UPDATE public.fornecedores
SET slug = lower(regexp_replace(nome, '\s+', '', 'g'))
WHERE slug IS NULL;

-- Garantir unicidade do slug
ALTER TABLE public.fornecedores
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_slug_key ON public.fornecedores(slug);

-- Upsert dos 3 fornecedores oficiais
INSERT INTO public.fornecedores (slug, nome, api_url, api_key_secret, rede_social, prioridade, ativo, status)
VALUES
  ('smmhype',   'SMMhype',         'https://smmhype.com',         'SMMHYPE_API_KEY',   'instagram', 1, true,  'Online'),
  ('smmpainel', 'SMMPainel',       'https://smmpainel.com',       'SMMPAINEL_API_KEY', 'instagram', 2, false, 'Offline'),
  ('verified',  'Verified Atacado','https://verifiedatacado.com', 'VERIFIED_API_KEY',  'instagram', 3, false, 'Offline')
ON CONFLICT (slug) DO UPDATE SET
  api_url = EXCLUDED.api_url,
  api_key_secret = EXCLUDED.api_key_secret,
  prioridade = EXCLUDED.prioridade;
