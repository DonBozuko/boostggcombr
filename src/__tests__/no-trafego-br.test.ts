// v356 — Tráfego BR apagado de vez. Não havia fornecedor brasileiro real,
// então o pacote voltava pela sincronização e era pausado toda varredura
// (alarme eterno). Esta invariante impede que ele volte pelo código.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(__dirname, "..");

function varrer(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "__tests__" || ent.name === "node_modules") continue;
      varrer(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(ent.name)) acc.push(full);
  }
  return acc;
}

describe("v356 — categoria trafego:br não existe mais", () => {
  it("nenhum módulo declara a categoria trafego:br", () => {
    const ofensores: string[] = [];
    for (const arquivo of varrer(raiz)) {
      for (const linha of fs.readFileSync(arquivo, "utf8").split("\n")) {
        const t = linha.trim();
        if (t.startsWith("//")) continue;
        if (t.includes("trafego:br")) ofensores.push(`${arquivo}: ${t}`);
      }
    }
    expect(ofensores).toEqual([]);
  });

  it("pacote wbr* não resolve mais para categoria nenhuma", async () => {
    const { categoryFromPacote } = await import("@/lib/pricing-engine.server");
    expect(categoryFromPacote("wbr1k")).toBeNull();
    expect(categoryFromPacote("wgl1k")).toBe("trafego:global");
  });
});
