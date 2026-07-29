// v359 — INVARIANTE: o motor de preço não pode apagar o vínculo do banco com
// o ID chumbado no código.
//
// Caso real: p350k/p500k e yv1.5m..yv10m foram vinculados a fornecedores que
// entregam a quantidade; a sincronização seguinte regravou o ID antigo da
// matriz do código (que não entrega) e o alerta de "custo disparou" voltou.

import { describe, it, expect } from "vitest";
import { chooseBoundServiceId } from "@/lib/bind-authority";

const ranges = new Map<number, { min?: number; max?: number }>([
  [8666, { min: 50, max: 10_000_000 }],   // entrega 350k/500k
  [14321, { min: 100, max: 1_000_000 }],  // teto 1M — não entrega 1,5M
  [18785, { min: 1_000_000, max: 1_000_000_000 }],
]);

describe("v359 — vínculo do banco vence a semente do código", () => {
  it("mantém o vínculo bom mesmo com semente diferente", () => {
    expect(chooseBoundServiceId({ candidate: "193", existing: "8666", qty: 350_000, ranges })).toBe("8666");
  });

  it("troca pela semente quando o vínculo não entrega a quantidade", () => {
    expect(chooseBoundServiceId({ candidate: "18785", existing: "14321", qty: 1_500_000, ranges })).toBe("18785");
  });

  it("sem vínculo, usa a semente", () => {
    expect(chooseBoundServiceId({ candidate: "18785", existing: null, qty: 2_000_000, ranges })).toBe("18785");
  });

  it("faixa desconhecida não apaga vínculo bom", () => {
    expect(chooseBoundServiceId({ candidate: "193", existing: "99999", qty: 350_000, ranges })).toBe("99999");
  });

  it("vínculo dentro da faixa continua valendo para pacote pequeno", () => {
    expect(chooseBoundServiceId({ candidate: "8666", existing: "14321", qty: 500_000, ranges })).toBe("14321");
  });
});
