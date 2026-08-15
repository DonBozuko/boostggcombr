-- 1) Adicionar colunas faltantes (a tabela foi criada parcialmente)
alter table public.jarvis_incidents 
  add column if not exists dedup_key text,
  add column if not exists occurrence_count integer not null default 1,
  add column if not exists last_seen_at timestamptz not null default now();

-- 2) Ajustar nullability de colunas de array (vistas como nullable no read_query)
alter table public.jarvis_incidents 
  alter column alert_ids set not null,
  alter column audit_log_ids set not null;

-- 3) Aplicar Constraints de Integridade (closure check)
alter table public.jarvis_incidents 
  drop constraint if exists jarvis_incidents_closure_integrity;

alter table public.jarvis_incidents 
  add constraint jarvis_incidents_closure_integrity check (
    (status = 'CLOSED' 
       and closed_at is not null 
       and regression_verified = true
       and root_cause is not null 
       and validation_notes is not null)
    or (status <> 'CLOSED' and closed_at is null)
  );

-- 4) Índices de performance e deduplicação
create unique index if not exists jarvis_incidents_dedup_open_idx 
  on public.jarvis_incidents (dedup_key) 
  where status <> 'CLOSED' and dedup_key is not null;

create index if not exists jarvis_incidents_open_idx 
  on public.jarvis_incidents (created_at desc) 
  where status <> 'CLOSED';

create index if not exists jarvis_incidents_severity_idx 
  on public.jarvis_incidents (severity, created_at desc);

create index if not exists jarvis_incidents_alert_ids_idx 
  on public.jarvis_incidents using gin (alert_ids);

-- 5) Automação de updated_at
create or replace function public.tgs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists jarvis_incidents_set_updated_at on public.jarvis_incidents;
create trigger jarvis_incidents_set_updated_at
  before update on public.jarvis_incidents
  for each row execute function public.tgs_updated_at();

-- 6) Máquina de estados no banco (Defesa em Profundidade)
create or replace function public.tg_jarvis_incident_transition()
returns trigger language plpgsql as $$
declare
  allowed public.incident_status[];
begin
  if new.status = old.status then
    return new;
  end if;

  allowed := case old.status
    when 'DETECTED'                then array['INVESTIGATING','CLOSED']::public.incident_status[]
    when 'INVESTIGATING'           then array['ROOT_CAUSE_IDENTIFIED','CLOSED','DETECTED']::public.incident_status[]
    when 'ROOT_CAUSE_IDENTIFIED'   then array['FIX_APPLIED','INVESTIGATING']::public.incident_status[]
    when 'FIX_APPLIED'             then array['VALIDATING','ROOT_CAUSE_IDENTIFIED']::public.incident_status[]
    when 'VALIDATING'              then array['REGRESSION_VERIFIED','FIX_APPLIED','INVESTIGATING']::public.incident_status[]
    when 'REGRESSION_VERIFIED'     then array['CLOSED','VALIDATING']::public.incident_status[]
    when 'CLOSED'                  then array['DETECTED']::public.incident_status[]
  end;

  if not (new.status = any(allowed)) then
    raise exception 'Transicao invalida: % -> %', old.status, new.status;
  end if;

  return new;
end $$;

drop trigger if exists jarvis_incidents_transition on public.jarvis_incidents;
create trigger jarvis_incidents_transition
  before update of status on public.jarvis_incidents
  for each row execute function public.tg_jarvis_incident_transition();

-- 7) RLS Restritivo (Re-aplicar para garantir políticas administrativas)
alter table public.jarvis_incidents enable row level security;

-- Grants mínimos
grant select, insert, update on public.jarvis_incidents to authenticated;
grant all on public.jarvis_incidents to service_role;

-- Políticas com InitPlan cacheado (Performance)
drop policy if exists jarvis_incidents_admin_select on public.jarvis_incidents;
create policy jarvis_incidents_admin_select on public.jarvis_incidents
  for select to authenticated
  using ((select public.has_role(auth.uid(), 'admin')));

drop policy if exists jarvis_incidents_admin_insert on public.jarvis_incidents;
create policy jarvis_incidents_admin_insert on public.jarvis_incidents
  for insert to authenticated
  with check ((select public.has_role(auth.uid(), 'admin')));

drop policy if exists jarvis_incidents_admin_update on public.jarvis_incidents;
create policy jarvis_incidents_admin_update on public.jarvis_incidents
  for update to authenticated
  using ((select public.has_role(auth.uid(), 'admin')))
  with check ((select public.has_role(auth.uid(), 'admin')));