-- v636.1: Criação da entidade jarvis_incidents

DO $$ BEGIN
    CREATE TYPE public.incident_status AS ENUM (
        'DETECTED',
        'INVESTIGATING',
        'ROOT_CAUSE_IDENTIFIED',
        'FIX_APPLIED',
        'VALIDATING',
        'REGRESSION_VERIFIED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_severity AS ENUM (
        'critical',
        'error',
        'warning',
        'info'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.jarvis_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    status public.incident_status NOT NULL DEFAULT 'DETECTED',
    severity public.alert_severity NOT NULL DEFAULT 'warning',
    type text NOT NULL,
    headline text NOT NULL,
    origin text NOT NULL,
    root_cause text,
    fix_applied text,
    validation_notes text,
    regression_verified boolean NOT NULL DEFAULT false,
    closed_at timestamptz,
    alert_ids uuid[] DEFAULT '{}',
    audit_log_ids uuid[] DEFAULT '{}'
);

GRANT SELECT, INSERT, UPDATE ON public.jarvis_incidents TO authenticated;
GRANT ALL ON public.jarvis_incidents TO service_role;

ALTER TABLE public.jarvis_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage incidents" ON public.jarvis_incidents;
CREATE POLICY "Admins can manage incidents"
ON public.jarvis_incidents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.jarvis_incidents;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.jarvis_incidents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_status ON public.jarvis_incidents(status);
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_severity ON public.jarvis_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_created_at ON public.jarvis_incidents(created_at DESC);
