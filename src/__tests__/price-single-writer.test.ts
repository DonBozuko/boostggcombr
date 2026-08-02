import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// v305 — Trava estrutural: só UM módulo pode gravar preço.
// Sem este teste, daqui a três semanas outro motor volta a escrever price_brl
// e o "conserta e volta" renasce. O detector é permanente, não a correção.

const ALLOW = new Set(["src/lib/price-authority.server.ts"]);
const WRITE_RE = /price_brl\s*:/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("v305 — ponto único de gravação de preço", () => {
  it("nenhum módulo servidor grava price_brl em update/upsert fora da autoridade", () => {
    const infratores: string[] = [];
    for (const file of walk("src")) {
      const rel = file.replace(/\\/g, "/");
      if (ALLOW.has(rel)) continue;
      if (rel.includes("__tests__")) continue;
      const src = readFileSync(file, "utf8");
      // procura escrita em pricing_items com price_brl no mesmo bloco de update
      const blocos = src.split(/\.update\(|\.upsert\(/).slice(1);
      for (const b of blocos) {
        const head = b.slice(0, 400);
        if (WRITE_RE.test(head) && /pricing_items|patch|row/.test(src)) {
          // upsert de linha inteira do motor de catálogo é permitido só na
          // criação inicial da linha (arquivo do motor), listado aqui:
          if (rel === "src/lib/pricing-engine.server.ts") continue;
          infratores.push(rel);
          break;
        }
      }
    }
    expect(infratores).toEqual([]);
  });

  it("edição manual preserva preço existente e entrega a decisão à autoridade", () => {
    const src = readFileSync("src/lib/pricing-catalog.functions.ts", "utf8");
    const rowStart = src.indexOf("const row = {");
    const rowEnd = src.indexOf("};", rowStart);
    expect(src.slice(rowStart, rowEnd)).not.toMatch(/price_brl\s*:/);
    expect(src).toContain('enforcePriceAuthority("admin-catalog")');
  });
});
