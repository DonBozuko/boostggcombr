
-- C2: remove crons duplicados
DO $$
BEGIN
  PERFORM cron.unschedule('pedido-reconciler-v179');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('sla-watcher-v180');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- C3: revoga wallet_credit de authenticated/anon (só service_role usa via supabaseAdmin)
REVOKE ALL ON FUNCTION public.wallet_credit(text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_credit(text, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_credit(text, numeric) TO service_role;

-- A3: escalona syncs de fornecedores (evita pico simultâneo no banco)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-smmpanel-5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('sync-verified-5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('check-smmhype-saldo');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('sync-smmpanel-5min', '1-59/5 * * * *', $cron$
  SELECT net.http_post(
    url:='https://www.boostgg.com.br/api/public/hooks/sync-smmpanel',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10cmxpanhod2tjcWp3c3h5aG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTk1NDksImV4cCI6MjA5NzM3NTU0OX0.m_5m5uiNYKPcScfBbXH1XDAzy1vHnasYVxbvUkJnbvY"}'::jsonb,
    body:='{}'::jsonb) as request_id;
$cron$);

SELECT cron.schedule('sync-verified-5min', '2-59/5 * * * *', $cron$
  SELECT net.http_post(
    url:='https://www.boostgg.com.br/api/public/hooks/sync-verified',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10cmxpanhod2tjcWp3c3h5aG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTk1NDksImV4cCI6MjA5NzM3NTU0OX0.m_5m5uiNYKPcScfBbXH1XDAzy1vHnasYVxbvUkJnbvY"}'::jsonb,
    body:='{}'::jsonb) as request_id;
$cron$);

SELECT cron.schedule('check-smmhype-saldo', '3-59/5 * * * *', $cron$
  SELECT net.http_post(
    url:='https://www.boostgg.com.br/api/public/hooks/check-smmhype-saldo',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10cmxpanhod2tjcWp3c3h5aG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTk1NDksImV4cCI6MjA5NzM3NTU0OX0.m_5m5uiNYKPcScfBbXH1XDAzy1vHnasYVxbvUkJnbvY"}'::jsonb,
    body:='{}'::jsonb) as request_id;
$cron$);

-- A1: cancela pedidos órfãos (pending sem mp_id > 2h)
CREATE OR REPLACE FUNCTION public.cancel_orphan_pending()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE afetados integer;
BEGIN
  UPDATE public.pedidos
     SET status = 'cancelled',
         error_detail = COALESCE(error_detail,'') || ' [auto-cancel v225: órfão sem mp_id >2h]'
   WHERE status = 'pending'
     AND (mercado_pago_id IS NULL OR mercado_pago_id = '')
     AND created_at < now() - INTERVAL '2 hours';
  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados;
END; $$;

REVOKE ALL ON FUNCTION public.cancel_orphan_pending() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_orphan_pending() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('cancel-orphan-pending-30min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('cancel-orphan-pending-30min', '*/30 * * * *', $cron$
  SELECT public.cancel_orphan_pending();
$cron$);

-- B1: índice em admin_audit_logs(action)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
