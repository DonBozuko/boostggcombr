import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// v373: a rota pública de status do pedido NUNCA pode devolver texto técnico
// (error_detail) para o navegador do cliente. Só o bônus numérico é permitido.
describe("status público do pedido", () => {
  const src = readFileSync("src/lib/admin.functions.ts", "utf8");
  const handler = src.slice(0, src.indexOf("// === ADMIN"));

  it("não retorna error_detail no payload público", () => {
    expect(handler).not.toMatch(/return\s*\{[^}]*error_detail\s*:/s);
  });

  it("retorna apenas mystery_bonus derivado", () => {
    expect(handler).toContain("mystery_bonus");
  });
});
