CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin master read" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'fabiano.majestic@gmail.com');
CREATE POLICY "admin master insert" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'fabiano.majestic@gmail.com');