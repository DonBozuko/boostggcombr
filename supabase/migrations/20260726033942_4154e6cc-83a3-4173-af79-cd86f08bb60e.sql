CREATE TABLE public.reseller_topups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  valor_brl NUMERIC(12,2) NOT NULL CHECK (valor_brl > 0),
  mercado_pago_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.reseller_topups TO service_role;

ALTER TABLE public.reseller_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente diretor lê recargas" ON public.reseller_topups
  FOR SELECT TO authenticated USING (public.is_director());

CREATE INDEX idx_reseller_topups_mp ON public.reseller_topups(mercado_pago_id);
CREATE INDEX idx_reseller_topups_reseller ON public.reseller_topups(reseller_id, created_at DESC);

CREATE TRIGGER trg_reseller_topups_updated_at
  BEFORE UPDATE ON public.reseller_topups
  FOR EACH ROW EXECUTE FUNCTION public.set_recovery_updated_at();