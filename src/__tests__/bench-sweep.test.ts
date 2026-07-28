import { describe, expect, it } from "vitest";
import { classifyBench, summarizeBench, type BenchRow } from "@/lib/bench-sweep";
import { evaluateRoute, type PreflightProvider } from "@/lib/route-preflight";

const p = (o: Partial<PreflightProvider>): PreflightProvider => ({
  slug: "x",
  cost_brl: 1,
  provider_service_id: "100",
  saldo_atual: 50,
  unstable: false,
  ...o,
});

describe("v322 bancada de provas", () => {
  it("pacote grande com saldo curto NÃO é entregável (causa do estorno)", () => {
    const ranked = [p({ slug: "provider4", cost_brl: 40, saldo_atual: 16.53 })];
    const res = evaluateRoute(ranked, 283.44);
    expect(res.ok).toBe(false);
    const c = classifyBench(ranked, res);
    expect(c.verdict).toBe("saldo");
    expect(c.faltaRecarregar).toBeCloseTo(23.47, 2);
    expect(c.faltaEm).toBe("provider4");
  });

  it("pacote pequeno com o mesmo saldo continua entregável", () => {
    const ranked = [p({ slug: "provider4", cost_brl: 0.29, saldo_atual: 16.53 })];
    const res = evaluateRoute(ranked, 6.78);
    expect(res.ok).toBe(true);
    expect(classifyBench(ranked, res).verdict).toBe("entregavel");
  });

  it("separa problema de catálogo de problema de dinheiro", () => {
    const ranked = [p({ provider_service_id: null })];
    const c = classifyBench(ranked, evaluateRoute(ranked, 30));
    expect(c.verdict).toBe("catalogo");
  });

  it("custo que estoura margem vira veredito de margem, não de saldo", () => {
    const ranked = [p({ slug: "verified", cost_brl: 101.16, saldo_atual: 500 })];
    const c = classifyBench(ranked, evaluateRoute(ranked, 18));
    expect(c.verdict).toBe("margem");
  });

  it("resumo soma a maior recarga por fornecedor", () => {
    const base: Omit<BenchRow, "verdict" | "motivo" | "faltaRecarregar" | "faltaEm"> = {
      pacote: "p1",
      category: "instagram:seguidores",
      quantidade: 100,
      price_brl: 10,
      fornecedor: "provider4",
      custoBrl: 2,
    };
    const s = summarizeBench([
      { ...base, verdict: "saldo", motivo: "", faltaRecarregar: 10, faltaEm: "provider4" },
      { ...base, verdict: "saldo", motivo: "", faltaRecarregar: 23.47, faltaEm: "provider4" },
      { ...base, verdict: "entregavel", motivo: "", faltaRecarregar: null, faltaEm: null },
    ]);
    expect(s.entregavel).toBe(1);
    expect(s.recargaPorFornecedor.provider4).toBeCloseTo(23.47, 2);
    expect(s.rotasComProblema).toEqual(["instagram:seguidores"]);
  });
});
