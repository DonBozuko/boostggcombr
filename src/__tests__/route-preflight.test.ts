import { describe, it, expect } from "vitest";
import { evaluateRoute, type PreflightProvider } from "@/lib/route-preflight";

const p = (o: Partial<PreflightProvider>): PreflightProvider => ({
  slug: "x",
  cost_brl: 1,
  provider_service_id: "100",
  saldo_atual: 50,
  unstable: false,
  ...o,
});

describe("v297 preflight de rota — não cobrar o que não dá pra entregar", () => {
  it("libera quando existe fornecedor com ID, saldo e margem", () => {
    const r = evaluateRoute([p({ slug: "smmhype", cost_brl: 2 })], 30);
    expect(r.ok).toBe(true);
    expect(r.viable).toHaveLength(1);
  });

  it("bloqueia quando todos os IDs sumiram do catálogo (caso p15k)", () => {
    const r = evaluateRoute(
      [p({ slug: "smmhype", provider_service_id: null }), p({ slug: "verified", provider_service_id: null })],
      283.44,
    );
    expect(r.ok).toBe(false);
    expect(r.structural).toBe(true);
  });

  it("bloqueia quando o custo estoura a margem mínima (caso kf2k)", () => {
    const r = evaluateRoute([p({ slug: "verified", cost_brl: 101.16 })], 18);
    expect(r.ok).toBe(false);
    expect(r.structural).toBe(false);
    expect(r.reason).toMatch(/margem/i);
  });

  it("bloqueia quando nenhum fornecedor tem saldo", () => {
    expect(evaluateRoute([p({ saldo_atual: 0 })], 30).ok).toBe(false);
  });

  it("prefere fornecedor estável, mas não bloqueia se só houver instável", () => {
    const misto = evaluateRoute([p({ slug: "a", unstable: true }), p({ slug: "b" })], 30);
    expect(misto.viable.map((v) => v.slug)).toEqual(["b"]);

    const soInstavel = evaluateRoute([p({ slug: "a", unstable: true })], 30);
    expect(soInstavel.ok).toBe(true);
  });

  it("custo desconhecido não bloqueia a venda", () => {
    expect(evaluateRoute([p({ cost_brl: null })], 30).ok).toBe(true);
  });

  it("catálogo vazio bloqueia", () => {
    const r = evaluateRoute([], 30);
    expect(r.ok).toBe(false);
    expect(r.structural).toBe(true);
  });
});
