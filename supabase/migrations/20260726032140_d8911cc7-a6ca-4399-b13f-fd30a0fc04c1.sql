CREATE TABLE public.reseller_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  volume_mes TEXT,
  canal TEXT,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  nota_interna TEXT,
  client_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.reseller_applications TO service_role;

ALTER TABLE public.reseller_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente diretor le solicitacoes de revenda"
  ON public.reseller_applications FOR SELECT
  TO authenticated
  USING (public.is_director());

CREATE INDEX idx_reseller_apps_created ON public.reseller_applications (created_at DESC);
CREATE INDEX idx_reseller_apps_status ON public.reseller_applications (status, created_at DESC);

CREATE TRIGGER trg_reseller_apps_updated_at
  BEFORE UPDATE ON public.reseller_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_recovery_updated_at();