-- v576: Resolução de alertas Canary e SMMHype Auto-ID
-- Objetivo: Limpar alertas visuais e sincronizar IDs de fornecedor automáticos.

BEGIN;

-- 1. Resolver alertas críticos de entrega e budget (removendo do radar visual do admin)
UPDATE public.canary_alert_state 
SET resolved_at = now() 
WHERE alert_key IN ('entrega:ff100', 'canary:budget') 
  AND resolved_at IS NULL;

-- 2. Auto-resolução SMMHype: Promover IDs automáticos para IDs de serviço onde estão nulos
UPDATE public.pricing_items
SET smmhype_service_id = smmhype_auto_id
WHERE smmhype_service_id IS NULL 
  AND smmhype_auto_id IS NOT NULL;

COMMIT;