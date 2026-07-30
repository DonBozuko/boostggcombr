// v367 — INVARIANTE: só forma preço quem o despacho pode usar.
//
// Caso real (br-tf1k, br-tf5k, br-p5k, br-p10k...): o painel mais barato não
// tem refill. Em pacote BR o roteamento exige refill (v245), então esse painel
// NUNCA despacha — mas era ele quem definia o custo e, portanto, o preço.
// A Bancada julgava a margem com o custo de quem entrega de verdade e gritava
// "venderia no prejuízo" a cada varredura, para sempre.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { providerCanServe, serviceAcceptsQty } from "@/lib/critical-guards";

const SEM_REFILL = {
  name: "Seguidores Brasileiros | ⚡️ | ♻️R30 | 🥇",
  rate: 11.5,
  min: 1,
  max: 1_000_000,
  refill: false,
};
const COM_REFILL = {
  name: "💎 TikTok Brazil Followers ➜ [ High Quality | Refill: 30 Days ] 🇧🇷",
  rate: 4.27,
  min: 10,
  max: 1_000_000,
  refill: true,
};

describe("v367 — custo só de quem pode despachar", () => {
  it("pacote BR: fornecedor sem refill não entra na conta do custo", () => {
    expect(serviceAcceptsQty(SEM_REFILL, 1000)).toBe(true); // aceita a quantidade
    expect(providerCanServe({ brPackage: true, svc: SEM_REFILL, requireRefill: true })).toBe(false);
  });

  it("pacote BR: fornecedor com refill continua formando custo", () => {
    expect(providerCanServe({ brPackage: true, svc: COM_REFILL, requireRefill: true })).toBe(true);
  });

  it("pacote global: refill não é exigido (não estreitar rota sem motivo)", () => {
    expect(providerCanServe({ brPackage: false, svc: SEM_REFILL })).toBe(true);
  });

  it("o ciclo de custo aplica a mesma trava do despacho", () => {
    const src = readFileSync(
      path.resolve(__dirname, "../lib/pricing-cache.server.ts"),
      "utf8",
    );
    expect(src).toMatch(/providerCanServe\(\{\s*brPackage:\s*brPkg/);
    // Correção de fonte inválida não pode aposentar pacote.
    expect(src).toMatch(/fonteInvalida/);
  });
});
