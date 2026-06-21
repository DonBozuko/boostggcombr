
CREATE TABLE public.connection_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ok'
);

GRANT SELECT, INSERT ON public.connection_tests TO anon, authenticated;
GRANT ALL ON public.connection_tests TO service_role;

ALTER TABLE public.connection_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert connection tests"
  ON public.connection_tests FOR INSERT
  TO anon, authenticated
  WITH CHECK (char_length(status) <= 50);

CREATE POLICY "Anyone can read connection tests"
  ON public.connection_tests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.get_public_schema()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  constraint_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    (
      SELECT string_agg(DISTINCT tc.constraint_type::text, ', ')
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE kcu.table_schema = 'public'
        AND kcu.table_name = c.table_name
        AND kcu.column_name = c.column_name
    ) AS constraint_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_schema() TO anon, authenticated;
