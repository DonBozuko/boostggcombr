CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT ALL ON public.app_config TO service_role;
REVOKE ALL ON public.app_config FROM anon, authenticated;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service_role can do everything" ON public.app_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);