// v175 — Synthetic Purchase Simulator (DRY-ONLY)
// Roda o pipeline (pricing → pedido SIM → smart-routing → cálculo → Telegram) SEM
// tocar em saldo real, SEM despachar ao fornecedor, SEM movimentar Mercado Pago.
// Fluxo real de compra permanece inalterado — este arquivo só descreve a simulação.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  token: z.string().min(8),
  pacote: z.string().min(1),
  quantidade: z.number().int().positive(),
  handle: z.string().trim().min(2).max(200),
});

type Step = { key: string; ok: boolean; ms: number; detail: string };

function fmtBrl(v: number): string {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

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

    // 1) Pricing lookup
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
    const custoTabela = Number((pricing as any).cost_brl);
    mark("1_pricing_lookup", true, `venda ${fmtBrl(valor)} · custo tabela ${fmtBrl(custoTabela)}`, st1);

    // 2) Criar pedido SIMULADO (marcado com prefixo SIM- e status simulated)
    const st2 = Date.now();
    const { data: pedido, error: insErr } = await supabaseAdmin
      .from("pedidos")
      .insert({
        pacote: data.pacote,
        quantidade: data.quantidade,
        instagram_user: data.handle,
        valor,
        status: "simulated",
        error_detail: `SIMULATION · dry-only · ts=${new Date().toISOString()}`,
        mercado_pago_id: `SIM-${Date.now()}`,
      } as any)
      .select("id")
      .maybeSingle();
    if (insErr || !pedido) {
      mark("2_create_pedido", false, insErr?.message ?? "insert falhou", st2);
      return { ok: false as const, steps, pedidoId: null };
    }
    const pedidoId = (pedido as any).id as string;
    mark("2_create_pedido", true, `pedido SIM ${pedidoId.slice(0, 8)} criado (status=simulated)`, st2);

    // 3) Smart-routing — só LEITURA, escolhe fornecedor mais barato
    const st3 = Date.now();
    let ranked: any[] = [];
    try {
      const { rankProvidersByCost } = await import("./smart-routing.server");
      ranked = await rankProvidersByCost({ pacote: data.pacote, quantidade: data.quantidade });
      mark(
        "3_smart_routing",
        ranked.length > 0,
        ranked.length
          ? ranked.map((r) => `${r.slug}=${fmtBrl(Number(r.cost_brl ?? 0))}${r.unstable ? "⚠" : ""}`).join(" · ")
          : "nenhum fornecedor com service_id disponível",
        st3,
      );
    } catch (e) {
      mark("3_smart_routing", false, (e as Error).message, st3);
    }

    const escolhido = ranked[0] ?? null;
    const custoReal = Number(escolhido?.cost_brl ?? custoTabela);
    const fornecedorSlug: string | null = escolhido?.slug ?? null;

    // 4) Snapshot saldo fornecedor (SEM DEBITAR)
    const st4 = Date.now();
    let saldoAntes: number | null = null;
    if (fornecedorSlug) {
      const { data: f } = await supabaseAdmin
        .from("fornecedores")
        .select("saldo_atual")
        .eq("slug", fornecedorSlug)
        .maybeSingle();
      saldoAntes = Number((f as any)?.saldo_atual ?? 0);
    }
    mark(
      "4_saldo_snapshot",
      true,
      fornecedorSlug ? `${fornecedorSlug} · saldo atual ${fmtBrl(saldoAntes ?? 0)} (não debitado)` : "sem fornecedor",
      st4,
    );

    // 5) Cálculo completo de margem — reproduz PRIME15 (15% off) + Pix MP (0,99% + R$0,49)
    const st5 = Date.now();
    const valorCheio = valor;                                       // preço de vitrine (já com buffer 1.15 embutido)
    const descontoPrime15 = Number((valorCheio * 0.15).toFixed(4)); // abatido no checkout
    const valorPagoCliente = Number((valorCheio - descontoPrime15).toFixed(4)); // o que o cliente paga via Pix
    const taxaMp = Number((valorPagoCliente * 0.0099 + 0.49).toFixed(4));
    const pixLiquido = Number((valorPagoCliente - taxaMp).toFixed(4));
    const lucroBruto = Number((valorPagoCliente - custoReal).toFixed(4));
    const lucroLiquido = Number((pixLiquido - custoReal).toFixed(4));
    const margemPct = valorPagoCliente > 0 ? Number(((lucroLiquido / valorPagoCliente) * 100).toFixed(2)) : 0;
    const razaoNet = custoReal > 0 ? Number((lucroLiquido / custoReal).toFixed(2)) : 0;
    const saldoDepoisSimulado = saldoAntes != null ? Number((saldoAntes - custoReal).toFixed(4)) : null;
    mark(
      "5_calculo_margem",
      true,
      `pago ${fmtBrl(valorPagoCliente)} · bruto ${fmtBrl(lucroBruto)} · líq ${fmtBrl(lucroLiquido)} · margem ${margemPct}%`,
      st5,
    );

    // 6) Telegram — mensagem exclusiva de SIMULAÇÃO (não usa notifyAdminProvisioning)
    const st6 = Date.now();
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      const linhas = [
        "🧪 <b>SIMULAÇÃO DE COMPRA (dry-run)</b>",
        "<i>Nenhum saldo movimentado · nenhum pedido real enviado</i>",
        "",
        `Pedido SIM: <code>${pedidoId.slice(0, 8)}</code>`,
        `Handle teste: <b>${data.handle}</b>`,
        `Pacote: <b>${data.pacote}</b> × ${data.quantidade}`,
        "",
        "<b>💰 Financeiro</b>",
        `Valor pago (simulado): <b>${fmtBrl(valor)}</b>`,
        `Fornecedor escolhido: <b>${fornecedorSlug ?? "—"}</b>`,
        `Custo fornecedor: <b>${fmtBrl(custoReal)}</b>`,
        `Líquido após Pix MP (0,99% + R$0,49): ${fmtBrl(pixLiquido)}`,
        `Lucro bruto: ${fmtBrl(lucroBruto)}`,
        `Lucro líquido (com buffer PRIME15): <b>${fmtBrl(lucroLiquido)}</b>`,
        `Margem sobre venda: <b>${margemPct}%</b>`,
        `Razão líq/custo: <b>${razaoNet}×</b> (alvo ≥ 3×)`,
        "",
        "<b>🏦 Saldo fornecedor</b>",
        saldoAntes != null
          ? `Antes: ${fmtBrl(saldoAntes)}\nDepois (se real fosse): ${fmtBrl(saldoDepoisSimulado ?? 0)}\n<i>⚠ Nada foi debitado — modo simulação</i>`
          : "sem fornecedor selecionado",
        "",
        "<b>📊 Ranking custos</b>",
        ranked.length
          ? ranked.map((r) => `• ${r.slug}: ${fmtBrl(Number(r.cost_brl ?? 0))}${r.unstable ? " ⚠" : ""}`).join("\n")
          : "—",
      ];
      const res = await dispatchWhatsappAlert(linhas.join("\n"));
      mark("6_telegram_alert", res.ok, res.ok ? "mensagem SIM enviada" : `falha: ${res.detail}`, st6);
    } catch (e) {
      mark("6_telegram_alert", false, (e as Error).message, st6);
    }

    return {
      ok: true as const,
      steps,
      pedidoId,
      totalMs: Date.now() - t0,
      finalStatus: "simulated",
      mode: "dry" as const,
      calculo: {
        venda: valor,
        custo: custoReal,
        pixLiquido,
        lucroBruto,
        lucroLiquido,
        margemPct,
        razaoNet,
        saldoAntes,
        saldoDepoisSimulado,
        fornecedor: fornecedorSlug,
      },
    };
  });
