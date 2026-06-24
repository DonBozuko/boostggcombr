
CREATE TABLE IF NOT EXISTS public.services_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_service_id integer NOT NULL UNIQUE,
  category text NOT NULL,
  name text NOT NULL,
  rate double precision NOT NULL,
  refill boolean NOT NULL DEFAULT false,
  min integer NOT NULL DEFAULT 0,
  max integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.services_cache TO service_role;

ALTER TABLE public.services_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny public access services_cache select"
  ON public.services_cache FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny public access services_cache insert"
  ON public.services_cache FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_services_cache_provider_id ON public.services_cache(provider_service_id);

-- Schedule sync every 6 hours
DO $$
DECLARE
  v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'CRON_ADMIN_TOKEN' LIMIT 1;
  IF v_token IS NULL THEN
    -- create vault secret using ADMIN_TOKEN if available via current_setting; otherwise random
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'CRON_ADMIN_TOKEN');
  END IF;
END $$;

SELECT cron.unschedule('sync-smmhype-services') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-smmhype-services');

SELECT cron.schedule(
  'sync-smmhype-services',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/sync-services',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_ADMIN_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);
