
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  saldo_atual numeric NOT NULL DEFAULT 0,
  saldo_minimo numeric NOT NULL DEFAULT 300,
  meta_ideal numeric NOT NULL DEFAULT 1000,
  ultimo_update timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  saldo_atual numeric NOT NULL DEFAULT 0,
  saldo_minimo_seguranca numeric NOT NULL DEFAULT 2000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  mensagem text NOT NULL,
  nivel int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX alerts_created_at_idx ON public.alerts (created_at DESC);
CREATE INDEX alerts_status_idx ON public.alerts (status);

INSERT INTO public.suppliers (nome, saldo_atual, saldo_minimo, meta_ideal)
VALUES ('SMMhype', 0, 300, 1000)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.bank_accounts (nome, saldo_atual, saldo_minimo_seguranca)
VALUES ('Caixa Principal', 0, 2000)
ON CONFLICT (nome) DO NOTHING;
