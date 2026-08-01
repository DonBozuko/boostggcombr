// v397 — INVARIANTE: o teste automático de 15 min também conserta antes de medir.
//
// Bug real (01:30): o smoke test leu o catálogo entre a gravação do custo novo
// e a rampa da Autoridade de Preço, e mandou "tl200k vendendo com prejuízo"
// quando o banco já tinha custo R$ 308 × preço R$ 971,65 (margem saudável).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "src/services/smoke-test.server.ts"), "utf8");

describe("v397 — smoke test conserta o preço antes de julgar margem", () => {
  it("chama a Autoridade de Preço", () => {
    expect(src).toContain("enforcePriceAuthority");
  });

  it("a autoridade roda ANTES da leitura do catálogo", () => {
    const autoridade = src.indexOf("enforcePriceAuthority");
    const leitura = src.indexOf('.from("pricing_items"');
    expect(autoridade).toBeGreaterThan(-1);
    expect(leitura).toBeGreaterThan(-1);
    expect(autoridade).toBeLessThan(leitura);
  });

  it("falha da autoridade não derruba o teste (try/catch próprio)", () => {
    const i = src.indexOf("enforcePriceAuthority");
    expect(src.slice(i - 400, i + 400)).toContain("catch");
  });

  it("margem continua usando a régua única do margin-guardian", () => {
    expect(src).toContain("respectsMinMargin");
    expect(src).not.toMatch(/cost\s*\*\s*2\.9/);
  });
});
