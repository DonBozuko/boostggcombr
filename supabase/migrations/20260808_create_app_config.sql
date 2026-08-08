CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

-- Configuração inicial do token se não existir
INSERT INTO public.app_config (key, value)
VALUES ('mercado_pago_token', jsonb_build_object('access_token', null, 'expires_at', 0))
ON CONFLICT (key) DO NOTHING;
