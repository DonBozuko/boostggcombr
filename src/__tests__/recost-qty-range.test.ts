// v358 — INVARIANTE: o RECUSTO por fornecedor de reserva também obedece a
// faixa de quantidade (v351).
//
// Caso real: p350k (350.000) e p500k (500.000) apontavam para o serviço de
// reserva smmpanel #52, que aceita no máximo 200.000. O recusto gravava o
// custo barato desse serviço; o ciclo seguinte lia o custo real de quem
// entrega (verified) e via um salto de ~4x → "PACOTE APOSENTADO".
// O mesmo alerta chegou 5x idêntico no celular do dono.

import { describe, it, expect } from "vitest";
import { serviceAcceptsQty } from "@/lib/critical-guards";

type Svc = { rate: number; min?: number; max?: number };

/** Espelha a escolha de tarifa dentro de recostFromReserves. */
function taxaDeQuemEntrega(candidatos: Array<Svc | undefined>, qty: number): number {
  const viaveis = candidatos
    .filter((s): s is Svc => !!s && Number.isFinite(s.rate) && s.rate > 0)
    .filter((s) => serviceAcceptsQty(s, qty));
  return viaveis.length ? Math.min(...viaveis.map((s) => s.rate)) : 0;
}

describe("v358 — recusto de reserva não usa fornecedor fora da faixa", () => {
  const smmpanel52: Svc = { rate: 1.927, min: 100, max: 200_000 };

  it("p350k: serviço com teto 200k não define o custo", () => {
    expect(taxaDeQuemEntrega([smmpanel52], 350_000)).toBe(0);
  });

  it("p500k: serviço com teto 200k não define o custo", () => {
    expect(taxaDeQuemEntrega([smmpanel52], 500_000)).toBe(0);
  });

  it("dentro da faixa, o recusto continua valendo", () => {
    expect(taxaDeQuemEntrega([smmpanel52], 100_000)).toBe(1.927);
  });

  it("com dois viáveis, vence o mais barato", () => {
    const verified: Svc = { rate: 8.2, min: 1000, max: 1_000_000 };
    expect(taxaDeQuemEntrega([smmpanel52, verified], 150_000)).toBe(1.927);
    expect(taxaDeQuemEntrega([smmpanel52, verified], 400_000)).toBe(8.2);
  });

  it("faixa desconhecida não bloqueia (falta de dado não para venda)", () => {
    expect(taxaDeQuemEntrega([{ rate: 3 }], 500_000)).toBe(3);
  });
});
