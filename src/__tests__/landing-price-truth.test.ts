// v337 — Trava de Preço Honesto nas landings SEO.
// Causa raiz: 14 landings tinham tabela de preço escrita à mão, sem id e sem
// categoria — o Google indexava valor que não existia no catálogo (ex.: 1.000
// inscritos "R$ 149,90" quando o real era R$ 223,54). Este teste impede volta.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "src/routes");

describe("landings SEO: preço só existe ligado ao catálogo", () => {
  const arquivos = readdirSync(DIR).filter((f) => f.endsWith(".tsx"));

  for (const f of arquivos) {
    const src = readFileSync(join(DIR, f), "utf8");
    if (!src.includes("<SeoLanding") || !/price:\s*"R\$/.test(src)) continue;

    it(`${f} declara pricingCategories e id em toda linha de preço`, () => {
      expect(src).toContain("pricingCategories={[");
      const linhas = src.match(/\{\s*id:[^}]*price:\s*"R\$[^}]*\}|\{\s*qty:[^}]*price:\s*"R\$[^}]*\}/g) ?? [];
      expect(linhas.length).toBeGreaterThan(0);
      for (const l of linhas) expect(l).toMatch(/id:\s*"/);
    });
  }
});
