// v380 — Trava do contador de inscritos.
//
// O contador quebrou calado porque o YouTube trocou o formato do HTML.
// Estes testes travam a leitura em todos os formatos já vistos: se um novo
// formato aparecer e nenhum caminho casar, o teste falha antes de ir pro ar.

import { describe, it, expect } from "vitest";
import { extrairInscritosTexto, parseInscritos } from "@/lib/contador-inscritos.functions";

describe("contador de inscritos — leitura resiliente", () => {
  it("lê o formato antigo (simpleText)", () => {
    const html = `x"subscriberCountText":{"simpleText":"30,1 mi de inscritos"}y`;
    expect(extrairInscritosTexto(html)).toContain("30,1 mi");
  });

  it("lê o formato novo (texto solto na página)", () => {
    const html = `<div>Canal oficial</div><span>30,1 mi de inscritos</span>`;
    expect(extrairInscritosTexto(html)).toContain("30,1 mi");
  });

  it("lê canal em inglês", () => {
    expect(extrairInscritosTexto(`<span>442M subscribers</span>`)).toContain("442M");
  });

  it("não inventa número quando o canal esconde a contagem", () => {
    expect(extrairInscritosTexto(`<html><body>sem contagem aqui</body></html>`)).toBeNull();
  });

  it("converte as abreviações do YouTube", () => {
    expect(parseInscritos("30,1 mi")).toBe(30_100_000);
    expect(parseInscritos("980 mil")).toBe(980_000);
    expect(parseInscritos("442M")).toBe(442_000_000);
    expect(parseInscritos("1,2 B")).toBe(1_200_000_000);
    expect(parseInscritos("847")).toBe(847);
  });
});
