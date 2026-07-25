import { describe, it, expect } from "vitest";
import {
  isBrPackage,
  isToxicService,
  providerCanServe,
  compareProviders,
} from "@/lib/critical-guards";

// FLUXO 1 — Trava BR no despacho. Este teste existe por causa do caso Sybele:
// pacote brasileiro entregue com perfis estrangeiros.
describe("trava BR no despacho", () => {
  it("reconhece pacote BR por categoria e por prefixo", () => {
    expect(isBrPackage("tf1k", "instagram:br")).toBe(true);
    expect(isBrPackage("br-tf1k", null)).toBe(true);
    expect(isBrPackage("wbr500", null)).toBe(true);
    expect(isBrPackage("tf1k", "instagram:global")).toBe(false);
  });

  it("bloqueia fornecedor internacional em pacote BR", () => {
    expect(
      providerCanServe({ brPackage: true, svc: { name: "Instagram Followers [Global]" } }),
    ).toBe(false);
  });

  it("aceita fornecedor brasileiro em pacote BR", () => {
    expect(
      providerCanServe({ brPackage: true, svc: { name: "Instagram Seguidores Brasileiros 🇧🇷" } }),
    ).toBe(true);
    expect(providerCanServe({ brPackage: true, svc: { name: "TikTok Brazil Real" } })).toBe(true);
  });

  it("bloqueia serviço tóxico mesmo se for brasileiro", () => {
    expect(isToxicService("Seguidores Brasil - NÃO COMPRE")).toBe(true);
    expect(
      providerCanServe({ brPackage: true, svc: { name: "Seguidores Brasil", category: "100% de queda" } }),
    ).toBe(false);
  });

  it("não bloqueia quando não há catálogo em cache (não parar venda)", () => {
    expect(providerCanServe({ brPackage: true, svc: null })).toBe(true);
  });

  it("pacote global aceita serviço internacional", () => {
    expect(providerCanServe({ brPackage: false, svc: { name: "Global Followers" } })).toBe(true);
  });

  it("v245 — pacote BR exige refill quando requireRefill=true", () => {
    const brSvc = { name: "Instagram Seguidores Brasileiros 🇧🇷", refill: false };
    expect(providerCanServe({ brPackage: true, svc: brSvc, requireRefill: true })).toBe(false);
    expect(providerCanServe({ brPackage: true, svc: { ...brSvc, refill: true }, requireRefill: true })).toBe(true);
  });

  it("v245 — trava dura não afeta pacotes globais", () => {
    expect(providerCanServe({ brPackage: false, svc: { name: "Global Followers", refill: false }, requireRefill: true })).toBe(true);
  });
});

// FLUXO 2 — Ordem de despacho: garantia antes de preço em pacote BR.
describe("ordem de despacho", () => {
  const cascadeOrder = { smmhype: 0, smmpainel: 1, verified: 2 };
  const sort = (list: any[], brPackage: boolean, refillMap: Record<string, boolean>) =>
    [...list].sort((a, b) => compareProviders(a, b, { brPackage, refillMap, cascadeOrder })).map((p) => p.slug);

  const providers = [
    { slug: "smmpainel", unstable: false, cost_brl: 1.0 },
    { slug: "smmhype", unstable: false, cost_brl: 1.5 },
    { slug: "verified", unstable: false, cost_brl: 0.8 },
  ];

  it("pacote global: vence o mais barato", () => {
    expect(sort(providers, false, {})[0]).toBe("verified");
  });

  it("pacote BR: quem tem reposição vence o mais barato sem reposição", () => {
    expect(sort(providers, true, { smmhype: true })[0]).toBe("smmhype");
  });

  it("fornecedor instável sempre vai para o fim", () => {
    const list = [
      { slug: "verified", unstable: true, cost_brl: 0.1 },
      { slug: "smmhype", unstable: false, cost_brl: 9.0 },
    ];
    expect(sort(list, false, {})[0]).toBe("smmhype");
  });

  it("sem custo conhecido fica atrás de quem tem custo", () => {
    const list = [
      { slug: "verified", unstable: false, cost_brl: null },
      { slug: "smmpainel", unstable: false, cost_brl: 5.0 },
    ];
    expect(sort(list, false, {})[0]).toBe("smmpainel");
  });
});

// FLUXO 3 — v246: moeda nativa do fornecedor no cálculo de custo.
describe("moeda nativa do fornecedor", () => {
  it("painéis BR não multiplicam pela cotação USD", async () => {
    const { effectiveFx, isBrlNativeProvider } = await import("@/lib/critical-guards");
    expect(isBrlNativeProvider("smmpainel")).toBe(true);
    expect(isBrlNativeProvider("verified")).toBe(true);
    expect(isBrlNativeProvider("provider4")).toBe(true);
    expect(isBrlNativeProvider("smmhype")).toBe(false);
    expect(effectiveFx("verified", 5.0781)).toBe(1);
    expect(effectiveFx("smmhype", 5.0781)).toBe(5.0781);
  });
});
