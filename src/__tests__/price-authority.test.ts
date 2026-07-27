import { describe, it, expect } from "vitest";
import { planAuthorityPrices, AUTHORITY_MAX_UP } from "@/lib/price-authority";
import { computeGuardedPrice, respectsMinMargin } from "@/lib/margin-guardian";

// v305 — o "conserta e volta" era ausência de dono do preço.
// Estes testes provam as invariantes da autoridade única.

const row = (pacote: string, quantidade: number, cost_brl: number, price_brl: number, category = "instagram:seguidores") =>
  ({ pacote, category, quantidade, cost_brl, price_brl });

describe("v305 — autoridade única de preço", () => {
  it("é idempotente: segunda passada não muda nada", () => {
    const banco = [row("p1k", 1000, 4, 0), row("p2k", 2000, 9, 0), row("p3k", 3000, 14, 0)].map((r) => ({
      ...r,
      price_brl: computeGuardedPrice(r.cost_brl, r.quantidade),
    }));
    const um = planAuthorityPrices(banco);
    expect(um.changes).toHaveLength(0);
    const dois = planAuthorityPrices(um.rows);
    expect(dois.changes).toHaveLength(0);
  });

  it("não derruba preço saudável quando o custo cai (fim da oscilação da vitrine)", () => {
    const preco = computeGuardedPrice(10, 1000);
    const { changes } = planAuthorityPrices([row("p1k", 1000, 2, preco)]);
    expect(changes).toHaveLength(0);
  });

  it("sobe preço quando o custo estoura a margem mínima (dentro do teto de +40%)", () => {
    const [r] = planAuthorityPrices([row("p1k", 1000, 3.2, 16)]).changes;
    expect(r.para).toBeGreaterThan(16);
    expect(r.para).toBeLessThanOrEqual(16 * AUTHORITY_MAX_UP + 0.01);
    expect(respectsMinMargin(r.para, 3.2)).toBe(true);
  });


  it("não aplica salto acima do teto: vira decisão do dono", () => {
    const { changes, blocked } = planAuthorityPrices([row("p1k", 1000, 500, 30)]);
    expect(changes).toHaveLength(0);
    expect(blocked[0].salto).toBeGreaterThan(AUTHORITY_MAX_UP);
  });

  it("resolve margem e escada no MESMO passe (o ping-pong dos dois motores)", () => {
    // Estado real que voltava todo ciclo: pacote maior mais barato que o menor.
    const banco = [row("ys20k", 20000, 100, 48100.5, "youtube:inscritos"), row("ys30k", 30000, 40, 17545.71, "youtube:inscritos")];
    const plano = planAuthorityPrices(banco);
    const final = new Map(plano.rows.map((r) => [r.pacote, r.price_brl]));
    expect(final.get("ys30k")!).toBeGreaterThan(final.get("ys20k")!);
    // e o resultado já está estável
    expect(planAuthorityPrices(plano.rows).changes).toHaveLength(0);
  });

  it("preço abaixo da margem nunca continua na vitrine: ou sobe, ou é bloqueado", () => {
    const banco = [row("p1k", 1000, 8, 10), row("p2k", 2000, 16, 12)];
    const plano = planAuthorityPrices(banco);
    const bloqueados = new Set(plano.blocked.map((b) => b.pacote));
    for (const r of plano.rows) {
      if (bloqueados.has(r.pacote)) continue;
      expect(r.price_brl).toBeGreaterThanOrEqual(computeGuardedPrice(r.cost_brl, r.quantidade) - 0.01);
    }
    // nenhum dos dois pode simplesmente ficar como estava vendendo no prejuízo
    expect(bloqueados.size + plano.changes.length).toBe(2);
  });
});

describe("v306 — piso comercial não pausa pacote com margem real", () => {
  it("pacote-isca barato com margem >4x continua na vitrine e sem reajuste", () => {
    // caso real: v1k / tv1k — custo R$0,455, preço R$6,00, ~9x líquido.
    const plano = planAuthorityPrices([row("v1k", 1000, 0.455, 6, "instagram:visualizacoes")]);
    expect(plano.blocked).toHaveLength(0);
    expect(plano.changes).toHaveLength(0);
  });

  it("mas preço sem margem real continua sendo tratado", () => {
    const plano = planAuthorityPrices([row("x1k", 1000, 3.0, 6, "instagram:visualizacoes")]);
    expect(plano.blocked.length + plano.changes.length).toBe(1);
  });
});
