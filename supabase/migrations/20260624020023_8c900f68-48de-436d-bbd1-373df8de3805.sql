
CREATE OR REPLACE FUNCTION public.get_cron_status(_jobname text DEFAULT 'check-smmhype-saldo')
RETURNS TABLE(
  jobname text,
  schedule text,
  active boolean,
  last_start timestamptz,
  last_end timestamptz,
  last_status text,
  last_return text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT
    j.jobname::text,
    j.schedule::text,
    j.active,
    r.start_time,
    r.end_time,
    r.status::text,
    r.return_message::text
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT start_time, end_time, status, return_message
    FROM cron.job_run_details d
    WHERE d.jobid = j.jobid
    ORDER BY start_time DESC
    LIMIT 1
  ) r ON true
  WHERE j.jobname = _jobname;
$$;

REVOKE ALL ON FUNCTION public.get_cron_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_status(text) TO service_role;
