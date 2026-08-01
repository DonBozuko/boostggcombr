// v398 — INVARIANTE: o Motor Anti-Alucinação existe e é executável.
//
// Sem medidor, eu volto a julgar o sistema de memória — que foi a causa raiz do
// retrabalho (alerta vencido, "já corrigi" genérico, correção repetida).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("v398 — motor anti-alucinação", () => {
  it("o auditor executável existe", () => {
    expect(existsSync(join(root, "scripts/audit.mjs"))).toBe(true);
  });

  it("está ligado ao npm run audit", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.scripts.audit).toContain("scripts/audit.mjs");
  });

  it("o protocolo escrito existe", () => {
    expect(existsSync(join(root, ".lovable/anti-hallucination.md"))).toBe(true);
  });

  it("cobre as checagens que protegem dinheiro", () => {
    const src = readFileSync(join(root, "scripts/audit.mjs"), "utf8");
    for (const check of [
      "preco-dono-unico",
      "segredo-no-codigo",
      "critico-sem-teste",
      "nada-fake",
      "serverfn-modulo-fino",
    ]) {
      expect(src).toContain(check);
    }
  });

  it("defeito bloqueante derruba o processo (exit 1)", () => {
    const src = readFileSync(join(root, "scripts/audit.mjs"), "utf8");
    expect(src).toContain("process.exit((counts.bloqueante || 0) > 0 ? 1 : 0)");
  });
});
