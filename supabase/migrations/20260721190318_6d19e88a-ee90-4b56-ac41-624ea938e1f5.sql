
-- v179: Base do Reconciliador Universal
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS provider_slug TEXT,
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconcile_attempts INTEGER NOT NULL DEFAULT 0;

-- Índice para o reconciliador: pedidos pagos, ordenados por data
CREATE INDEX IF NOT EXISTS idx_pedidos_reconcile
  ON public.pedidos (status, created_at)
  WHERE status IN ('paid', 'waiting_provision');

-- Backfill: recupera provider_slug + order_id do ledger para pedidos que já foram enviados
UPDATE public.pedidos p
SET provider_slug = fl.fornecedor_slug,
    provider_order_id = fl.telemetry->>'order_id',
    dispatched_at = COALESCE(p.dispatched_at, fl.ts_utc)
FROM public.financial_ledger fl
WHERE fl.pedido_id = p.id
  AND fl.telemetry->>'order_id' IS NOT NULL
  AND fl.telemetry->>'order_id' <> ''
  AND p.provider_order_id IS NULL;
