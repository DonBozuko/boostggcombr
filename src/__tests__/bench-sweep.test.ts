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
  it("v352 — saldo curto vira aviso de recarga, mas a venda continua liberada", () => {
    const ranked = [p({ slug: "provider4", cost_brl: 40, saldo_atual: 16.53 })];
    const res = evaluateRoute(ranked, 283.44);
    expect(res.ok).toBe(true);
    expect(res.needsTopup).toBe(true);
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

describe("v335 diagnóstico honesto e recarga realista", () => {
  it("fornecedor caro que estoura margem não rotula o pacote como prejuízo quando o barato só está sem saldo", () => {
    const ranked = [
      p({ slug: "smmpainel", cost_brl: 40, saldo_atual: 5 }),
      p({ slug: "verified", cost_brl: 400, saldo_atual: 9999 }),
    ];
    const res = evaluateRoute(ranked, 200);
    const c = classifyBench(ranked, res);
    expect(c.verdict).toBe("saldo");
    expect(c.faltaEm).toBe("smmpainel");
  });

  it("recarga de pacote que ninguém compra fica em 'sob demanda'", () => {
    const base = {
      category: "youtube:inscritos",
      quantidade: 100000,
      price_brl: 10,
      fornecedor: "verified",
      custoBrl: 2,
    };
    const s = summarizeBench(
      [
        { ...base, pacote: "ys1k", verdict: "saldo", motivo: "", faltaRecarregar: 30, faltaEm: "verified" },
        { ...base, pacote: "ys100k", verdict: "saldo", motivo: "", faltaRecarregar: 91910, faltaEm: "verified" },
      ] as BenchRow[],
      { demanda: new Set(["ys1k"]) },
    );
    expect(s.recargaPorFornecedor.verified).toBe(30);
    expect(s.recargaSobDemanda.verified).toBe(91910);
  });

  it("sem histórico de demanda, nada é escondido", () => {
    const s = summarizeBench([
      {
        pacote: "x",
        category: "c",
        quantidade: 1,
        price_brl: 1,
        verdict: "saldo",
        motivo: "",
        fornecedor: "v",
        custoBrl: 1,
        faltaRecarregar: 50,
        faltaEm: "v",
      },
    ]);
    expect(s.recargaPorFornecedor.v).toBe(50);
    expect(s.recargaSobDemanda).toEqual({});
  });
});
