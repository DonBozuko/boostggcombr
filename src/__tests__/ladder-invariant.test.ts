import { describe, it, expect } from "vitest";
import { enforceMonotonicLadder } from "@/lib/price-monotonic";

// v304 — regressão do "conserta e volta".
// Reproduz o ciclo real: motor A grava preço por categoria, motor B regrava
// item-a-item pelo custo do fornecedor. A escada precisa ser a ÚLTIMA palavra
// sobre o estado final do banco — não sobre o lote de cada motor.
type Row = { pacote: string; category: string; quantidade: number; price_brl: number };

const cat = "youtube:inscritos";

describe("v304 — escada como invariante final", () => {
  it("lote parcial não garante escada; passe final sobre o banco inteiro garante", () => {
    const banco: Row[] = [
      { pacote: "ys20k", category: cat, quantidade: 20000, price_brl: 48100.5 },
      { pacote: "ys30k", category: cat, quantidade: 30000, price_brl: 17545.71 },
    ];

    // Motor B só enxerga o pacote que ele mesmo recalculou → não vê a inversão.
    const loteParcial = banco.filter((r) => r.pacote === "ys30k");
    expect(enforceMonotonicLadder(loteParcial).fixes).toHaveLength(0);

    // Passe final sobre o estado real do banco pega e corrige.
    const final = enforceMonotonicLadder(banco);
    expect(final.fixes).toHaveLength(1);
    expect(final.rows.find((r) => r.pacote === "ys30k")!.price_brl).toBeGreaterThan(48100.5);
  });

  it("passe final é idempotente (rodar de novo não muda nada)", () => {
    const banco: Row[] = [
      { pacote: "p2k", category: "instagram:seguidores", quantidade: 2000, price_brl: 90 },
      { pacote: "p3k", category: "instagram:seguidores", quantidade: 3000, price_brl: 54 },
    ];
    const um = enforceMonotonicLadder(banco);
    const dois = enforceMonotonicLadder(um.rows);
    expect(um.fixes).toHaveLength(1);
    expect(dois.fixes).toHaveLength(0);
  });

  it("correção de escada nunca reduz preço (não come margem)", () => {
    const banco: Row[] = [
      { pacote: "a", category: cat, quantidade: 100, price_brl: 200 },
      { pacote: "b", category: cat, quantidade: 200, price_brl: 10 },
      { pacote: "c", category: cat, quantidade: 300, price_brl: 15 },
    ];
    const { rows } = enforceMonotonicLadder(banco);
    for (const orig of banco) {
      expect(rows.find((r) => r.pacote === orig.pacote)!.price_brl).toBeGreaterThanOrEqual(orig.price_brl);
    }
  });
});
