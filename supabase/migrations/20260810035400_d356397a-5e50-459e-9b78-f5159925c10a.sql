
DO $$
BEGIN
    -- SMMhype (provider_service_id costuma ser text em alguns caches e int em outros, convertendo para text p/ segurança)
    UPDATE public.pricing_items SET smmhype_auto_id = NULL WHERE smmhype_auto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.smmhype_services_cache WHERE provider_service_id::text = public.pricing_items.smmhype_auto_id::text);
    -- SMMPanel
    UPDATE public.pricing_items SET smmpanel_auto_id = NULL WHERE smmpanel_auto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.smmpanel_services_cache WHERE provider_service_id::text = public.pricing_items.smmpanel_auto_id::text);
    -- Verified
    UPDATE public.pricing_items SET verified_auto_id = NULL WHERE verified_auto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.verified_services_cache WHERE provider_service_id::text = public.pricing_items.verified_auto_id::text);
    -- Provider4
    UPDATE public.pricing_items SET provider4_auto_id = NULL WHERE provider4_auto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.provider4_services_cache WHERE provider_service_id::text = public.pricing_items.provider4_auto_id::text);
END $$;
