// v170 — Synthetic Purchase Simulator
// Roda o mesmo pipeline de uma compra real (pedido → smart-routing → dispatch → telegram)
// SEM tocar no Mercado Pago. Retorna trace passo-a-passo pra auditoria de erro.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  token: z.string().min(8),
  pacote: z.string().min(1),
  quantidade: z.number().int().positive(),
  handle: z.string().trim().min(2).max(200),
  mode: z.enum(["dry", "real"]),
});

type Step = { key: string; ok: boolean; ms: number; detail: string };

export const listSimulatablePackages = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string().min(8) }).parse(i))
  .handler(async ({ data }) => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false as const, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, category, quantidade, cost_brl, price_brl")
      .order("category")
      .order("quantidade");
    return { ok: true as const, rows: (rows ?? []) as any[] };
  });

export const simulatePurchase = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false as const, error: "UNAUTHORIZED", steps: [] as Step[] };
    }
    const steps: Step[] = [];
    const t0 = Date.now();
    const mark = (key: string, ok: boolean, detail: string, startedAt: number) =>
      steps.push({ key, ok, ms: Date.now() - startedAt, detail });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar linha de pricing p/ valor + custo
    const st1 = Date.now();
    const { data: pricing } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, price_brl, cost_brl")
      .eq("pacote", data.pacote)
      .eq("quantidade", data.quantidade)
      .maybeSingle();
    if (!pricing) {
      mark("1_pricing_lookup", false, `Nenhum pricing_item para ${data.pacote} x${data.quantidade}`, st1);
      return { ok: false as const, steps, pedidoId: null };
    }
    const valor = Number((pricing as any).price_brl);
    mark("1_pricing_lookup", true, `preço R$${valor.toFixed(2)} · custo R$${Number((pricing as any).cost_brl).toFixed(4)}`, st1);

    // Criar pedido de simulação
    const st2 = Date.now();
    const { data: pedido, error: insErr } = await supabaseAdmin
      .from("pedidos")
      .insert({
        pacote: data.pacote,
        quantidade: data.quantidade,
        instagram_user: data.handle,
        valor,
        status: "paid",
        error_detail: `SIMULATION:${data.mode} · ts=${new Date().toISOString()}`,
        mercado_pago_id: `SIM-${Date.now()}`,
      } as any)
      .select("id")
      .maybeSingle();
    if (insErr || !pedido) {
      mark("2_create_pedido", false, insErr?.message ?? "insert falhou", st2);
      return { ok: false as const, steps, pedidoId: null };
    }
    const pedidoId = (pedido as any).id as string;
    mark("2_create_pedido", true, `pedido ${pedidoId} criado`, st2);

    // Smart-routing (ranqueia fornecedor mais barato com saldo)
    const st3 = Date.now();
    let ranked: any[] = [];
    try {
      const { rankProvidersByCost } = await import("./smart-routing.server");
      ranked = await rankProvidersByCost({ pacote: data.pacote, quantidade: data.quantidade });
      if (!ranked.length) {
        mark("3_smart_routing", false, "nenhum fornecedor disponível (sem saldo/ID)", st3);
      } else {
        mark(
          "3_smart_routing",
          true,
          ranked.map((r) => `${r.slug}=R$${Number(r.cost_brl ?? 0).toFixed(4)}${r.unstable ? "⚠" : ""}`).join(" · "),
          st3,
        );
      }
    } catch (e) {
      mark("3_smart_routing", false, (e as Error).message, st3);
    }

    // Dispatch (só em modo real)
    let dispatchOk = false;
    let dispatchDetail = "";
    if (data.mode === "real" && ranked.length) {
      const st4 = Date.now();
      try {
        const { dispatchByFornecedor } = await import("./dispatcher-fallback.server");
        for (const f of ranked) {
          const r = await dispatchByFornecedor(f.slug, {
            pacote: data.pacote,
            quantidade: data.quantidade,
            instagram_user: data.handle,
            serviceIdOverride: (f as any).provider_service_id ?? null,
          });
          if (r.ok) {
            dispatchOk = true;
            dispatchDetail = `${f.slug} → orderId ${r.orderId}`;
            await supabaseAdmin
              .from("pedidos")
              .update({ status: "Enviado", fornecedor: f.slug, order_id_externo: String(r.orderId) } as any)
              .eq("id", pedidoId);
            break;
          } else {
            dispatchDetail += `${f.slug}✗ ${r.error} · `;
          }
        }
        mark("4_dispatch_real", dispatchOk, dispatchDetail || "todos falharam", st4);
      } catch (e) {
        mark("4_dispatch_real", false, (e as Error).message, st4);
      }
    } else {
      mark("4_dispatch_real", true, data.mode === "dry" ? "SKIP (dry-run)" : "SKIP (sem fornecedor)", Date.now());
    }

    // Se não despachou, marca waiting_provision (mesmo caminho da venda real)
    if (!dispatchOk) {
      const st5 = Date.now();
      const custo = ranked[0]?.cost_brl ?? null;
      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "waiting_provision",
          error_detail: `SIMULATION · aguardando (${data.mode})`,
          ...(custo != null ? { custo_real: Number(Number(custo).toFixed(4)) } : {}),
        } as any)
        .eq("id", pedidoId);
      mark("5_waiting_provision", true, `pedido parqueado · custo estim R$${Number(custo ?? 0).toFixed(4)}`, st5);
    }

    // Telegram — mesmo caminho da venda real
    const st6 = Date.now();
    try {
      const { notifyAdminProvisioning } = await import("./whatsapp-admin.server");
      await notifyAdminProvisioning({
        pedidoId: `SIM-${pedidoId}`,
        vendaBrl: valor,
        custoBrl: ranked[0]?.cost_brl ?? null,
        fornecedor: ranked[0]?.slug ?? null,
        motivo: `🧪 SIMULAÇÃO (${data.mode.toUpperCase()}) · ${dispatchOk ? "ENVIADO" : "PARQUEADO"} · pacote ${data.pacote} x${data.quantidade} @${data.handle}`,
      });
      mark("6_telegram_alert", true, "notifyAdminProvisioning enviado", st6);
    } catch (e) {
      mark("6_telegram_alert", false, (e as Error).message, st6);
    }

    return {
      ok: true as const,
      steps,
      pedidoId,
      totalMs: Date.now() - t0,
      finalStatus: dispatchOk ? "Enviado" : "waiting_provision",
      mode: data.mode,
    };
  });
