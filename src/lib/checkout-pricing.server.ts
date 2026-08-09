// v590 — AUTORIDADE ÚNICA DE PREÇO NO CHECKOUT.
//
// Antes existiam TRÊS fontes de preço no caminho da cobrança:
//   1. leitura direta de pricing_items (variantes br-*),
//   2. pricing-engine (getPricingGridImpl, que por sua vez lê pricing_items),
//   3. PRICE_TABLE — tabela fixa dentro de pedidos.functions.ts.
//
// A tabela fixa estava até 38% ABAIXO do preço aprovado no banco (p500 12,00
// vs 19,00; yv1k 19,00 vs 30,58) e não continha pacotes realmente vendidos
// (p50, p150, p200). Quando o motor de preço falhava, o sistema ou vendia
// barato (perda de margem) ou recusava um pacote válido (venda perdida).
//
// Regra a partir daqui: preço, quantidade oficial e disponibilidade vêm de UMA
// única leitura de `pricing_items`. Se essa leitura falhar, o checkout falha de
// forma honesta (PRICE_UNAVAILABLE) em vez de inventar um preço.
//
// Bônus de latência: a mesma leitura devolve `is_sellable` e os vínculos de
// fornecedor, eliminando duas idas extras ao banco que liam a MESMA linha.

export type CheckoutPricing =
  | {
      ok: true;
      valor: number;
      quantidade: number;
      custo: number;
    }
  | {
      ok: false;
      error: "INVALID_PACKAGE" | "PRICE_UNAVAILABLE";
      motivo: string;
    };

type PricingRow = {
  price_brl: number | string | null;
  quantidade: number | string | null;
  cost_brl: number | string | null;
  is_sellable: boolean | null;
  sellable_reason: string | null;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
  provider4_service_id: string | null;
  smmhype_auto_id: string | null;
  smmpanel_auto_id: string | null;
  verified_auto_id: string | null;
  provider4_auto_id: string | null;
};

const COLS =
  "price_brl, quantidade, cost_brl, is_sellable, sellable_reason, " +
  "smmhype_service_id, smmpanel_service_id, verified_service_id, provider4_service_id, " +
  "smmhype_auto_id, smmpanel_auto_id, verified_auto_id, provider4_auto_id";

/**
 * Leitura ÚNICA da linha do pacote. Decide preço, quantidade oficial e se o
 * pacote pode ser cobrado agora — tudo com uma ida ao banco.
 *
 * `pacoteRaw` é o id completo, incluindo o prefixo `br-` quando existir.
 */
export async function resolveCheckoutPricing(pacoteRaw: string): Promise<CheckoutPricing> {
  let row: PricingRow | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pricing_items" as never)
      .select(COLS)
      .eq("pacote", pacoteRaw)
      .maybeSingle();
    if (error) throw error;
    row = (data as unknown as PricingRow) ?? null;
  } catch (err) {
    // Fail-closed de PREÇO: sem banco não existe preço confiável. Recusar uma
    // venda rara custa menos que vender abaixo do custo aprovado.
    console.error("[checkout-pricing] v590 leitura de preço falhou:", err);
    return {
      ok: false,
      error: "PRICE_UNAVAILABLE",
      motivo: "Não foi possível confirmar o preço oficial agora.",
    };
  }

  if (!row) {
    return { ok: false, error: "INVALID_PACKAGE", motivo: `Pacote "${pacoteRaw}" não existe no catálogo.` };
  }

  const valor = Number(row.price_brl);
  const quantidade = Number(row.quantidade);
  const custo = Number(row.cost_brl);

  if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(quantidade) || quantidade <= 0) {
    return { ok: false, error: "INVALID_PACKAGE", motivo: "Pacote sem preço válido no catálogo." };
  }

  const temFornecedor = !!(
    row.smmhype_service_id ||
    row.smmpanel_service_id ||
    row.verified_service_id ||
    row.provider4_service_id ||
    row.smmhype_auto_id ||
    row.smmpanel_auto_id ||
    row.verified_auto_id ||
    row.provider4_auto_id
  );
  const temCusto = Number.isFinite(custo) && custo > 0;

  if (row.is_sellable === false || !temFornecedor || !temCusto) {
    const motivo =
      row.sellable_reason ??
      (!temFornecedor ? "Sem fornecedor vinculado" : !temCusto ? "Custo zerado" : "Pacote pausado");
    return { ok: false, error: "INVALID_PACKAGE", motivo };
  }

  return { ok: true, valor, quantidade, custo: temCusto ? custo : 0 };
}

/**
 * Preço aceito do cliente: só honra o valor mostrado na tela quando ele está
 * dentro de 1% do preço oficial E não é menor que o oficial menos essa folga
 * (v540). Fora disso vale sempre o servidor.
 */
export function precoAceito(serverValor: number, clientValor: number): number {
  if (!Number.isFinite(clientValor) || clientValor <= 0) return serverValor;
  const drift = Math.abs(clientValor - serverValor) / serverValor;
  if (drift <= 0.01 && clientValor >= serverValor * 0.99) return Number(clientValor.toFixed(2));
  return serverValor;
}
