INSERT INTO public.admin_settings (key, value)
VALUES ('global_kill', jsonb_build_object('blocked', false, 'reason', null, 'activated_at', null))
ON CONFLICT (key) DO NOTHING;