
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  api_url text NOT NULL,
  api_key_secret text NOT NULL,
  saldo_atual double precision,
  status text NOT NULL DEFAULT 'Offline',
  ultima_verificacao timestamptz,
  falhas_consecutivas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny public access fornecedores select" ON public.fornecedores FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny public access fornecedores insert" ON public.fornecedores FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE TABLE public.monitoramento_saldo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  saldo double precision,
  status text NOT NULL,
  data_hora timestamptz NOT NULL DEFAULT now(),
  tempo_resposta_ms integer,
  erro_retornado text
);
GRANT ALL ON public.monitoramento_saldo TO service_role;
ALTER TABLE public.monitoramento_saldo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny public access monitoramento select" ON public.monitoramento_saldo FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny public access monitoramento insert" ON public.monitoramento_saldo FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE INDEX idx_monitoramento_fornecedor_data ON public.monitoramento_saldo(fornecedor_id, data_hora DESC);

INSERT INTO public.fornecedores (nome, api_url, api_key_secret, status)
VALUES ('SMMhype', 'https://smmhype.com/api/v2', 'SMMHYPE_API_KEY', 'Offline')
ON CONFLICT (nome) DO NOTHING;
