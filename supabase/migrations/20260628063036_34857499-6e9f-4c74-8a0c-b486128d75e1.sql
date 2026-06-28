
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.admin_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Public read only for the sandbox_mode flag (no other settings exposed)
DROP POLICY IF EXISTS "public read sandbox flag" ON public.admin_settings;
CREATE POLICY "public read sandbox flag"
  ON public.admin_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'sandbox_mode');

-- Full management restricted to the master admin email
DROP POLICY IF EXISTS "admin manage settings" ON public.admin_settings;
CREATE POLICY "admin manage settings"
  ON public.admin_settings
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'fabiano.majestic@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'fabiano.majestic@gmail.com');

INSERT INTO public.admin_settings (key, value)
VALUES ('sandbox_mode', jsonb_build_object('enabled', false))
ON CONFLICT (key) DO NOTHING;
