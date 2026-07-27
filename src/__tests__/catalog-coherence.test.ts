import { describe, it, expect } from "vitest";
import { analyzeCatalogCoherence, type CoherenceRow } from "@/lib/catalog-coherence";

const base = (o: Partial<CoherenceRow>): CoherenceRow => ({
  pacote: "x",
  category: "instagram:seguidores",
  quantidade: 100,
  cost_brl: 1,
  price_brl: 10,
  last_dry_run: new Date().toISOString(),
  serviceIds: [],
  ...o,
});

describe("coerência do catálogo", () => {
  it("pega escada invertida (maior mais barato)", () => {
    const issues = analyzeCatalogCoherence(
      [
        base({ pacote: "p100", quantidade: 100, price_brl: 22.28 }),
        base({ pacote: "p250", quantidade: 250, price_brl: 8.8 }),
      ],
      new Map(),
    );
    expect(issues.some((i) => i.code === "ESCADA_QUEBRADA" && i.pacote === "p250")).toBe(true);
  });

  it("não acusa escada saudável", () => {
    const issues = analyzeCatalogCoherence(
      [
        base({ pacote: "p100", quantidade: 100, price_brl: 10, cost_brl: 1 }),
        base({ pacote: "p250", quantidade: 250, price_brl: 20, cost_brl: 2.5 }),
      ],
      new Map(),
    );
    expect(issues.filter((i) => i.code !== "TESTE_SECO_CEGO")).toHaveLength(0);
  });

  it("pega serviço incompatível com a categoria", () => {
    const issues = analyzeCatalogCoherence(
      [base({ pacote: "yv2m", category: "youtube:visualizacoes", serviceIds: ["195"] })],
      new Map([["195", "YouTube Espectadores ao Vivo"]]),
    );
    expect(issues.some((i) => i.code === "SERVICO_INCOERENTE")).toBe(true);
  });

  it("pega custo fora da curva", () => {
    const issues = analyzeCatalogCoherence(
      [
        base({ pacote: "a", quantidade: 1000, cost_brl: 1, price_brl: 10 }),
        base({ pacote: "b", quantidade: 2000, cost_brl: 2, price_brl: 20 }),
        base({ pacote: "c", quantidade: 3000, cost_brl: 120, price_brl: 400 }),
      ],
      new Map(),
    );
    expect(issues.some((i) => i.code === "CUSTO_FORA_DA_CURVA" && i.pacote === "c")).toBe(true);
  });

  it("avisa quando o teste seco está velho", () => {
    const old = new Date(Date.now() - 100 * 3600_000).toISOString();
    const issues = analyzeCatalogCoherence([base({ last_dry_run: old })], new Map());
    expect(issues.some((i) => i.code === "TESTE_SECO_CEGO")).toBe(true);
  });
});
