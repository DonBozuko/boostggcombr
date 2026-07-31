insert into public.admin_settings (key, value)
values ('autonomia_reposicao', jsonb_build_object('enabled', true, 'ts', now()::text, 'origem', 'v393'))
on conflict (key) do update set value = excluded.value;