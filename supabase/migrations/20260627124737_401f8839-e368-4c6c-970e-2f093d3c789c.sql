ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS network TEXT NOT NULL DEFAULT 'instagram',
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT '1:1',
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_token TEXT;

CREATE INDEX IF NOT EXISTS scheduled_posts_network_idx ON public.scheduled_posts(network);
CREATE INDEX IF NOT EXISTS scheduled_posts_status_idx ON public.scheduled_posts(status);