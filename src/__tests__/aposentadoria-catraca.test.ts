// v370 — INVARIANTE: alta de custo não aposenta pacote.
//
// Caso real (br-tf100, br-p100, br-tf500...): salto de custo >80% tirava 7
// pacotes da vitrine de uma vez, com motivo que NENHUM religamento automático
// reconhecia. Como todo fornecedor mexe em preço o tempo todo, em N ciclos o
// catálogo inteiro morreria — catraca só para baixo. O preço é decidido pela
// Autoridade (rampa de +40% por ciclo), que pausa apenas quando nem a rampa
// cobre a margem, e devolve o pacote sozinho quando o preço converge.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { planAuthorityPrices } from "@/lib/price-authority";

const read = (p: string) => readFileSync(path.resolve(__dirname, p), "utf8");

describe("v370 — sem aposentadoria por percentual de custo", () => {
  it("o motor de custo não tem mais teto de aposentadoria", () => {
    const src = read("../lib/pricing-cache.server.ts");
    expect(src).not.toMatch(/RETIRE_ABOVE/);
    expect(src).not.toMatch(/pacote aposentado automaticamente/);
    expect(src).not.toMatch(/PACOTE APOSENTADO/);
  });

  it("pausa por custo tem volta automática pela Autoridade", () => {
    const src = read("../lib/price-authority.server.ts");
    expect(src).toMatch(/\.like\("sellable_reason", "custo do fornecedor%"\)/);
  });

  it("custo +83% (br-tf100 real) vira rampa de preço, não pausa", () => {
    const plan = planAuthorityPrices([
      { pacote: "br-tf100", category: "tiktok", quantidade: 100, cost_brl: 1.16, price_brl: 7.25 },
    ]);
    expect(plan.blocked).toHaveLength(0);
    const mudou = plan.changes.find((c) => c.pacote === "br-tf100");
    // sobe no máximo +40% por ciclo, continua vendendo
    if (mudou) expect(mudou.para).toBeLessThanOrEqual(7.25 * 1.4 + 0.01);
  });
});
