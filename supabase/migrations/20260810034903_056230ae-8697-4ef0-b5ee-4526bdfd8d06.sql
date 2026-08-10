-- v595: Corrigindo função RPC para ignorar coluna inexistente 'updated_at' e garantir permissões.

CREATE OR REPLACE FUNCTION public.bulk_update_pricing(updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    update_record record;
    applied_count int := 0;
    error_count int := 0;
    failed_items text[] := ARRAY[]::text[];
BEGIN
    FOR update_record IN SELECT * FROM jsonb_to_recordset(updates) AS x(pacote text, price numeric)
    LOOP
        BEGIN
            UPDATE public.pricing_items
            SET price_brl = update_record.price
            WHERE pacote = update_record.pacote;
            
            IF FOUND THEN
                applied_count := applied_count + 1;
            ELSE
                error_count := error_count + 1;
                failed_items := failed_items || (update_record.pacote || ': not found');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            failed_items := failed_items || (update_record.pacote || ': ' || SQLERRM);
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'applied', applied_count,
        'errors', error_count,
        'failed_items', failed_items
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_pricing(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_pricing(jsonb) TO service_role;
