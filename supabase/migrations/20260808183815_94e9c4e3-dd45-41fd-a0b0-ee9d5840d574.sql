-- v584: Função RPC para atualização atômica de preços em lote
-- Protege o pool de conexões e garante integridade transacional.

CREATE OR REPLACE FUNCTION public.bulk_update_pricing(updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item jsonb;
    v_applied int := 0;
    v_errors int := 0;
    v_failed_items text[] := ARRAY[]::text[];
    v_pacote text;
    v_price numeric;
BEGIN
    -- Validação básica de entrada
    IF updates IS NULL OR jsonb_array_length(updates) = 0 THEN
        RETURN jsonb_build_object(
            'applied', 0,
            'errors', 0,
            'failed_items', v_failed_items
        );
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        BEGIN
            v_pacote := (item->>'pacote')::text;
            -- Garantia de Casting Seguro: numeric
            v_price := (item->>'price')::numeric;

            IF v_pacote IS NULL OR v_price IS NULL THEN
                RAISE EXCEPTION 'Dados inválidos no item: %', item;
            END IF;

            UPDATE public.pricing_items
            SET 
                price_brl = v_price,
                updated_at = now()
            WHERE pacote = v_pacote;

            IF FOUND THEN
                v_applied := v_applied + 1;
            ELSE
                v_errors := v_errors + 1;
                v_failed_items := array_append(v_failed_items, v_pacote || ': not_found');
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            v_failed_items := array_append(v_failed_items, COALESCE(v_pacote, 'unknown') || ': ' || SQLERRM);
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'applied', v_applied,
        'errors', v_errors,
        'failed_items', v_failed_items
    );
END;
$$;

-- Grant necessário para o service_role chamar via supabaseAdmin
GRANT EXECUTE ON FUNCTION public.bulk_update_pricing(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_pricing(jsonb) TO authenticated;