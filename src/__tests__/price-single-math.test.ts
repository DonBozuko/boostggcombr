import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// v307 — Trava estrutural irmã da v305 (price-single-writer).
//
// A v305 vigiava QUEM GRAVA `price_brl`. Não vigiava QUEM CALCULA preço em
// memória — e era exatamente ali que estava a bagunça: `profit-markup.ts`
// mantinha uma segunda fórmula completa (tier 5x/8x/12x + piso escalonado +
// buffer de cupom) alimentada por custo chumbado dentro das landing pages.
// O cliente via preço fantasma até o banco responder.
//
// Regra a partir daqui: fórmula de preço só existe na Autoridade Única.
// Rota de venda não conhece custo. Transformações SOBRE o preço oficial
// (taxa de cartão, desconto de revenda) continuam permitidas — elas leem o
// preço final, não o recalculam a partir do custo.

const ALLOW_FORMULA = new Set([
  "src/lib/price-authority.ts",
  "src/lib/price-authority.server.ts",
  "src/lib/margin-guardian.ts",
  "src/lib/price-monotonic.ts",
  "src/lib/pricing-engine.server.ts", // preço-semente de linha nova, só isso
  // Inspetores read-only: apenas EXIBEM as constantes importadas da
  // Autoridade, não recalculam nada.
  "src/lib/claude-inspect.functions.ts",
  "src/components/ClaudeCodeInspector.tsx",
]);

// Marcas da fórmula antiga: multiplicador de margem por faixa, piso escalonado
// e buffer de cupom aplicados fora da autoridade.
const FORMULA_RE = /tierMultiplier|scaledFloor|applyProfitFormula|COUPON_BUFFER|FABIANO_COUPON/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk("src")
  .map((f) => f.replace(/\\/g, "/"))
  .filter((f) => !f.includes("__tests__"));

describe("v307 — fórmula de preço tem dono único", () => {
  it("nenhum módulo fora da Autoridade reimplementa a fórmula de preço", () => {
    const infratores = files.filter(
      (f) => !ALLOW_FORMULA.has(f) && FORMULA_RE.test(readFileSync(f, "utf8")),
    );
    expect(infratores).toEqual([]);
  });

  it("nenhuma rota de venda conhece custo de fornecedor", () => {
    const infratores = files
      .filter((f) => f.startsWith("src/routes/"))
      .filter((f) => /costPer1k|cost_per_1k|custoPor1k/.test(readFileSync(f, "utf8")));
    expect(infratores).toEqual([]);
  });

  it("profit-markup.ts só formata moeda — não calcula preço", () => {
    const src = readFileSync("src/lib/profit-markup.ts", "utf8");
    expect(src).not.toMatch(/buildPlans|applyProfitFormula|costPer1k/);
    expect(src).toMatch(/export function formatBRL/);
  });
});
