CREATE INDEX IF NOT EXISTS idx_admin_audit_action_created
  ON public.admin_audit_logs (action, created_at DESC);