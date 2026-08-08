CREATE OR REPLACE FUNCTION public.bulk_update_pricing(
  updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  update_item JSONB;
  applied_count INT := 0;
  error_count INT := 0;
  failed_items TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR update_item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    BEGIN
      UPDATE public.pricing_items
      SET price_brl = (update_item->>'price')::NUMERIC
      WHERE pacote = (update_item->>'pacote');
      
      IF FOUND THEN
        applied_count := applied_count + 1;
      ELSE
        error_count := error_count + 1;
        failed_items := array_append(failed_items, (update_item->>'pacote'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      failed_items := array_append(failed_items, (update_item->>'pacote'));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'applied', applied_count,
    'errors', error_count,
    'failed_items', failed_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_pricing(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_pricing(JSONB) TO authenticated;
