CREATE TABLE public.page_views (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  path TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_id TEXT,
  session_id TEXT,
  user_agent TEXT,
  country TEXT
);

CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_path_created ON public.page_views (path, created_at DESC);
CREATE INDEX idx_page_views_utm ON public.page_views (utm_source, created_at DESC) WHERE utm_source IS NOT NULL;

GRANT ALL ON public.page_views TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.page_views_id_seq TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_views service role only"
  ON public.page_views FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);