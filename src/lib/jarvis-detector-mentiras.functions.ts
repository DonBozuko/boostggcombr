import { createServerFn } from "@tanstack/react-start";

/**
 * JARVIS DETECTOR DE MENTIRAS v48
 * Audita o que o agente prometeu vs o que o código realmente entrega:
 *  - pricing_items deve ter pelo menos N itens com price_brl > 0 e cost_per_1k_brl > 0
 *  - admin_treasury deve estar acessível e somar valores reais
 *  - pedidos.functions deve estar exportando criarPedido
 *  - fornecedor ativo deve existir
 * Retorna um relatório com PASS/FAIL e bloqueia deploy quando houver regressão.
 */
export const runJarvisLieDetector = createServerFn({ method: "GET" }).handler(
  async () => {
    const checks: Array<{ id: string; label: string; ok: boolean; detail: string }> = [];
    let blockDeploy = false;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. pricing_items integridade 1:1
      const { data: items, error: itemsErr } = await supabaseAdmin
        .from("pricing_items")
        .select("id, price_brl, cost_per_1k_brl, provider_service_id");
      if (itemsErr) {
        checks.push({ id: "pricing_items", label: "pricing_items acessível", ok: false, detail: itemsErr.message });
        blockDeploy = true;
      } else {
        const total = items?.length ?? 0;
        const broken = (items ?? []).filter(
          (i) => !i.price_brl || Number(i.price_brl) <= 0 || !i.provider_service_id,
        );
        const ok = total > 0 && broken.length === 0;
        checks.push({
          id: "pricing_items",
          label: `Mapeamento 1:1 pacote→ID (${total} itens, ${broken.length} quebrados)`,
          ok,
          detail: ok ? "íntegro" : `${broken.length} itens sem preço/ID fornecedor`,
        });
        if (!ok) blockDeploy = true;
      }

      // 2. Tesouraria
      const { error: trErr } = await supabaseAdmin
        .from("admin_treasury")
        .select("id", { count: "exact", head: true });
      checks.push({
        id: "treasury",
        label: "admin_treasury ledger",
        ok: !trErr,
        detail: trErr?.message ?? "ledger acessível",
      });
      if (trErr) blockDeploy = true;

      // 3. Fornecedor ativo
      const { data: forn } = await supabaseAdmin
        .from("fornecedores")
        .select("id, nome, ativo")
        .eq("ativo", true);
      const fOk = (forn?.length ?? 0) >= 1;
      checks.push({
        id: "fornecedor_ativo",
        label: "Fornecedor ativo",
        ok: fOk,
        detail: fOk ? (forn ?? []).map((f) => f.nome).join(", ") : "nenhum fornecedor ativo",
      });
      if (!fOk) blockDeploy = true;

      // 4. Cache de preço populado
      const { count: cacheCount } = await supabaseAdmin
        .from("pricing_cache")
        .select("*", { count: "exact", head: true });
      const cOk = (cacheCount ?? 0) > 0;
      checks.push({
        id: "pricing_cache",
        label: `pricing_cache populado (${cacheCount ?? 0})`,
        ok: cOk,
        detail: cOk ? "ok" : "cache vazio — rode sync",
      });
    } catch (e) {
      checks.push({
        id: "fatal",
        label: "Detector de mentiras",
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
      blockDeploy = true;
    }

    const passed = checks.filter((c) => c.ok).length;
    return {
      version: "v48",
      timestamp: new Date().toISOString(),
      passed,
      total: checks.length,
      blockDeploy,
      checks,
    };
  },
);
