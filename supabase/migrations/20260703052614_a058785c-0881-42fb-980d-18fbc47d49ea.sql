create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('auto-healer-core-v172')
where exists (select 1 from cron.job where jobname = 'auto-healer-core-v172');

select cron.schedule(
  'auto-healer-core-v172',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://eliteboostprime.lovable.app/api/public/hooks/auto-healer',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhYmFzZSIsInJlZiI6Im10cmxpanhod2tjcWp3c3h5aG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTk1NDksImV4cCI6MjA5NzM3NTU0OX0.m_5m5uiNYKPcScfBbXH1XDAzy1vHnasYVxbvUkJnbvY"}'::jsonb,
    body := '{"source":"cron","version":"v172"}'::jsonb
  ) as request_id;
  $$
);