// v396 — INVARIANTE: consertar antes de medir.
//
// Bug real: a Bancada media o preço ANTES de a Autoridade de Preço rodar a
// rampa do ciclo. Resultado: alerta no celular com número já vencido ("4
// pacotes venderiam no prejuízo") enquanto o banco já tinha o preço corrigido.
// Alerta que não reflete o estado real é alerta que se aprende a ignorar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "src/services/bench-autonomo.server.ts"), "utf8");

describe("v396 — a bancada conserta o preço antes de julgar", () => {
  it("chama a Autoridade de Preço dentro da varredura", () => {
    expect(src).toContain("enforcePriceAuthority");
  });

  it("a autoridade roda ANTES da leitura do catálogo", () => {
    const autoridade = src.indexOf("enforcePriceAuthority");
    const leitura = src.indexOf('.from("pricing_items"');
    expect(autoridade).toBeGreaterThan(-1);
    expect(leitura).toBeGreaterThan(-1);
    expect(autoridade).toBeLessThan(leitura);
  });

  it("falha da autoridade não derruba a varredura (try/catch próprio)", () => {
    const trecho = src.slice(src.indexOf("enforcePriceAuthority") - 400, src.indexOf("enforcePriceAuthority") + 400);
    expect(trecho).toContain("catch");
  });
});
