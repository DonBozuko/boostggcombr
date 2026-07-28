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
      [base({ pacote: "yv2m", category: "youtube:visualizacoes", serviceIds: [{ provider: "verified", id: "195" }] })],
      new Map([["verified:195", "YouTube Espectadores ao Vivo"]]),
    );
    expect(issues.some((i) => i.code === "SERVICO_INCOERENTE")).toBe(true);
  });

  // v308 — regressão real: o id 143 existe em dois fornecedores com produtos
  // diferentes. Sem chave por fornecedor, o pacote certo era pausado por engano.
  it("não confunde mesmo id em fornecedores diferentes", () => {
    const issues = analyzeCatalogCoherence(
      [base({ pacote: "tl100", category: "tiktok:curtidas", serviceIds: [{ provider: "smmpanel", id: "143" }] })],
      new Map([
        ["smmpanel:143", "TikTok Curtidas Brasil"],
        ["verified:143", "Visualizações de transmissão ao vivo do FB"],
      ]),
    );
    expect(issues.some((i) => i.code === "SERVICO_INCOERENTE")).toBe(false);
  });

  it("custo alto com serviço correto vira aviso, não pausa", () => {
    const names = new Map([["smmhype:8431", "Instagram Brazilian Followers Premium"]]);
    const issues = analyzeCatalogCoherence(
      [
        base({ pacote: "a", quantidade: 1000, cost_brl: 1, price_brl: 10 }),
        base({ pacote: "b", quantidade: 2000, cost_brl: 2, price_brl: 20 }),
        base({
          pacote: "c",
          quantidade: 1000,
          cost_brl: 7.35,
          price_brl: 60,
          serviceIds: [{ provider: "smmhype", id: "8431" }],
        }),
      ],
      names,
    );
    const achado = issues.find((i) => i.code === "CUSTO_FORA_DA_CURVA" && i.pacote === "c");
    expect(achado?.severity).toBe("warning");
  });

  // v338 — premium é outro produto: comparar com o econômico gerava aviso
  // eterno e escondia o problema real.
  it("linha premium não é comparada com a econômica", () => {
    const issues = analyzeCatalogCoherence(
      [
        base({ pacote: "br-p1k", quantidade: 1000, cost_brl: 1, price_brl: 10 }),
        base({ pacote: "br-p2k", quantidade: 2000, cost_brl: 2, price_brl: 20 }),
        base({ pacote: "br-pro1k", quantidade: 1000, cost_brl: 7.35, price_brl: 60 }),
      ],
      new Map(),
    );
    expect(issues.filter((i) => i.pacote === "br-pro1k")).toEqual([]);
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

// v309 — regressão real: "Instagram Likes" não batia em \blike\b (plural),
// e 16 pacotes de visualizações ficaram vinculados a curtidas sem alerta.
describe("v309 — plural não escapa da coerência", () => {
  it("pega 'Instagram Likes' em pacote de visualizações", () => {
    const issues = analyzeCatalogCoherence(
      [base({ pacote: "v2k", category: "instagram:visualizacoes", serviceIds: [{ provider: "smmhype", id: "18855" }] })],
      new Map([["smmhype:18855", "⚪ Instagram Likes ➜ [Economy] [ Speed : 150K+/Day ]"]]),
    );
    expect(issues.some((i) => i.code === "SERVICO_INCOERENTE")).toBe(true);
  });

  it("não acusa o serviço correto de visualizações", () => {
    const issues = analyzeCatalogCoherence(
      [base({ pacote: "v2k", category: "instagram:visualizacoes", serviceIds: [{ provider: "smmhype", id: "13471" }] })],
      new Map([["smmhype:13471", "🟢 Instagram Views ➜ [Standard] [ +1M/Day | No Drop ]"]]),
    );
    expect(issues.some((i) => i.code === "SERVICO_INCOERENTE")).toBe(false);
  });
});
