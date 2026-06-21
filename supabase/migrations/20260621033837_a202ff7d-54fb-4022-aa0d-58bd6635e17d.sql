
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
SECURITY INVOKER
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
