// v305 — AUTORIDADE ÚNICA DE PREÇO (função pura, testável).
//
// CAUSA RAIZ do "conserta e volta" (v292 → v304 → e voltava):
// quatro rotinas diferentes gravavam `price_brl` no mesmo ciclo, cada uma com
// a sua própria fórmula e as suas próprias travas:
//   1. pricing-engine (passe por categoria, custo estimado)
//   2. recostFromReserves (recusto pelo fornecedor de reserva)
//   3. pricing-cache (passe item-a-item pelo custo vivo)
//   4. ladder-enforce (correção de escada)
// Cada uma consertava e a seguinte desfazia. Não existia bug isolado: existia
// AUSÊNCIA DE DONO. Nenhuma trava a mais resolve isso — só tirar a caneta da
// mão de todo mundo e dar para um só.
//
// Regra a partir daqui: os motores de sincronismo escrevem CUSTO e IDs.
// Quem decide PREÇO é este módulo, uma vez, no fim do ciclo, lendo o estado
// real do banco. Invariantes garantidas em conjunto (não uma de cada vez):
//   a) preço ≥ preço justo pela Equação Fabiano (margem mínima 4x líquida)
//   b) preço nunca desce sozinho enquanto a margem estiver saudável
//      (é isso que matava a oscilação da vitrine)
//   c) escada monotônica por categoria: pacote maior nunca mais barato
//   d) salto acima de +40% não é aplicado às cegas na cara do cliente: o
//      pacote SAI DA VITRINE e vira decisão do dono (nunca fica vendendo
//      abaixo da margem só porque o reajuste era grande)
//   e) idempotente — rodar duas vezes seguidas não muda nada

import { computeGuardedPrice, respectsMinMargin, FLOOR_BRL } from "./margin-guardian";
import { enforceMonotonicLadder } from "./price-monotonic";

/** Teto de reajuste automático para cima num único ciclo. */
export const AUTHORITY_MAX_UP = 1.4;

export type AuthorityRow = {
  pacote: string;
  category: string;
  quantidade: number;
  cost_brl: number;
  price_brl: number;
};

export type AuthorityChange = {
  pacote: string;
  de: number;
  para: number;
  motivo: "margem" | "escada" | "primeiro_preco";
};

export type AuthorityBlock = {
  pacote: string;
  atual: number;
  justo: number;
  salto: number;
};

export type AuthorityPlan = {
  checked: number;
  changes: AuthorityChange[];
  blocked: AuthorityBlock[];
  rows: AuthorityRow[];
};

const r2 = (v: number) => Number(v.toFixed(2));

/**
 * Decide o preço final de cada pacote a partir do custo vigente e do preço
 * atual. Não toca no banco: devolve o plano.
 */
export function planAuthorityPrices(input: AuthorityRow[]): AuthorityPlan {
  const blocked: AuthorityBlock[] = [];

  const rows = input.map((r) => ({ ...r }));
  const atual = new Map<string, number>();
  const motivos = new Map<string, AuthorityChange["motivo"]>();

  for (const r of rows) {
    const qty = Number(r.quantidade) || 0;
    const cost = Number(r.cost_brl) || 0;
    const price = Number(r.price_brl) || 0;
    atual.set(r.pacote, price);

    if (qty <= 0 || cost <= 0) {
      // Sem custo confiável a autoridade não opina: mantém o que está.
      r.price_brl = price;
      continue;
    }

    const justo = computeGuardedPrice(cost, qty);

    // (b) preço saudável não desce sozinho — fim da oscilação da vitrine.
    if (price > 0 && price >= justo && respectsMinMargin(price, cost)) {
      r.price_brl = price;
      continue;
    }

    // (d) salto grande demais não entra às cegas: pausa em vez de vender no
    // prejuízo ou trocar o preço na cara do cliente.
    if (price > 0 && justo > price * AUTHORITY_MAX_UP) {
      blocked.push({
        pacote: r.pacote,
        atual: r2(price),
        justo: r2(justo),
        salto: Number((justo / price).toFixed(3)),
      });
      r.price_brl = price;
      continue;
    }

    r.price_brl = r2(justo);
    motivos.set(r.pacote, price > 0 ? "margem" : "primeiro_preco");
  }

  // (c) escada é aplicada sobre o alvo final, não sobre o lote de um motor.
  const ladderInput = rows.filter(
    (r) => r.category && Number(r.quantidade) > 0 && Number(r.price_brl) > 0,
  );
  const { fixes } = enforceMonotonicLadder(ladderInput);
  const ladderTarget = new Map(fixes.map((f) => [f.pacote, f.para]));
  for (const r of rows) {
    const fixed = ladderTarget.get(r.pacote);
    if (fixed !== undefined) {
      r.price_brl = fixed;
      motivos.set(r.pacote, "escada");
    }
  }

  const changes: AuthorityChange[] = [];
  for (const r of rows) {
    const de = atual.get(r.pacote) ?? 0;
    const para = Number(r.price_brl) || 0;
    if (para <= 0) continue;
    if (Math.abs(para - de) <= 0.009) continue;
    changes.push({ pacote: r.pacote, de: r2(de), para: r2(para), motivo: motivos.get(r.pacote) ?? "margem" });
  }

  return { checked: rows.length, changes, blocked, rows };
}
