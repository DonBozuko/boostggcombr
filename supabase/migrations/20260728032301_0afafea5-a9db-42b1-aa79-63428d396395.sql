CREATE TABLE IF NOT EXISTS public.catalog_changes (
  id BIGSERIAL PRIMARY KEY,
  pacote TEXT NOT NULL,
  campo TEXT NOT NULL,
  valor_antes TEXT,
  valor_depois TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_changes_pacote_idx ON public.catalog_changes (pacote, changed_at DESC);
CREATE INDEX IF NOT EXISTS catalog_changes_campo_idx ON public.catalog_changes (campo, changed_at DESC);

GRANT ALL ON public.catalog_changes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.catalog_changes_id_seq TO service_role;

ALTER TABLE public.catalog_changes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_catalog_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campos TEXT[] := ARRAY[
    'is_sellable','sellable_reason','price_brl','cost_brl',
    'smmhype_service_id','smmpanel_service_id','verified_service_id','provider4_service_id',
    'smmhype_auto_id','smmpanel_auto_id','verified_auto_id','provider4_auto_id'
  ];
  c TEXT;
  antes TEXT;
  depois TEXT;
  o JSONB := to_jsonb(OLD);
  n JSONB := to_jsonb(NEW);
BEGIN
  FOREACH c IN ARRAY campos LOOP
    antes := o ->> c;
    depois := n ->> c;
    IF antes IS DISTINCT FROM depois THEN
      INSERT INTO public.catalog_changes (pacote, campo, valor_antes, valor_depois)
      VALUES (NEW.pacote, c, antes, depois);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_catalog_change ON public.pricing_items;
CREATE TRIGGER trg_log_catalog_change
AFTER UPDATE ON public.pricing_items
FOR EACH ROW EXECUTE FUNCTION public.log_catalog_change();

CREATE OR REPLACE FUNCTION public.purge_catalog_changes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.catalog_changes WHERE changed_at < now() - interval '30 days';
$$;