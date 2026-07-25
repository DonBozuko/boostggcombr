CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_key_time_idx
  ON public.rate_limit_hits (bucket_key, created_at DESC);

GRANT ALL ON public.rate_limit_hits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_hits_id_seq TO service_role;

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_hits_no_public_access"
  ON public.rate_limit_hits FOR SELECT TO authenticated USING (public.is_director());

CREATE OR REPLACE FUNCTION public.rate_limit_check(
  _key TEXT,
  _limit INTEGER,
  _window_seconds INTEGER
) RETURNS TABLE(allowed BOOLEAN, hits INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
BEGIN
  IF _key IS NULL OR length(trim(_key)) = 0 THEN
    RETURN QUERY SELECT true, 0, 0;
    RETURN;
  END IF;

  DELETE FROM public.rate_limit_hits
   WHERE created_at < now() - INTERVAL '1 hour';

  SELECT count(*), min(created_at) INTO v_count, v_oldest
    FROM public.rate_limit_hits
   WHERE bucket_key = _key
     AND created_at > now() - make_interval(secs => _window_seconds);

  IF v_count >= _limit THEN
    RETURN QUERY SELECT
      false,
      v_count,
      GREATEST(1, ceil(extract(epoch FROM (v_oldest + make_interval(secs => _window_seconds) - now())))::int);
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_hits(bucket_key) VALUES (_key);
  RETURN QUERY SELECT true, v_count + 1, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_check(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(TEXT, INTEGER, INTEGER) TO service_role;