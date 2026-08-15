CREATE OR REPLACE FUNCTION public.tgs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.tg_jarvis_incident_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end $function$;