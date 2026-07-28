// v350 — INVARIANTE: falta de saldo NUNCA tira pacote da vitrine.
// Saldo tem prazo (o dono repõe a qualquer hora e recebe aviso no celular).
// Pausa é só para falha real de entrega: catálogo/fornecedor (estrutural) ou
// margem negativa persistente. Este teste trava a regressão no código-fonte,
// porque a decisão de pausa mora dentro do serviço com acesso a banco.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/services/bench-autonomo.server.ts", "utf8");

describe("v350 — saldo não pausa pacote", () => {
  it("não existe caminho que marca pausa para o veredito saldo", () => {
    // Nenhum ramo do tipo: verdict === "saldo" → persistentes/estruturais.set
    const ramoSaldo = /verdict\s*===\s*"saldo"[\s\S]{0,600}?(persistentes|estruturais)\.set/;
    expect(ramoSaldo.test(src)).toBe(false);
  });

  it("não existe prazo de saldo virando pausa", () => {
    expect(src).not.toContain("PRAZO_SALDO_MS");
    expect(src).not.toContain("saldoVencido");
  });

  it("saldo faltando nunca sobe a severidade para crítico", () => {
    const sev = src.match(/severity:\s*([^,]+),/);
    expect(sev).toBeTruthy();
    expect(sev![1]).not.toMatch(/saldo/i);
  });

  it("pausa continua valendo para falha estrutural e margem", () => {
    expect(src).toMatch(/verdict\s*===\s*"catalogo"/);
    expect(src).toMatch(/verdict\s*===\s*"margem"/);
  });
});
