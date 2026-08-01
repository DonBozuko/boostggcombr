// v380 — Trava do contador de inscritos.
//
// Dois defeitos reais que estes testes travam para sempre:
// 1) O YouTube trocou o formato do HTML e o contador parou de ler (quebrou calado).
// 2) A página traz a contagem de VÁRIOS canais (sugestões). Pegar o primeiro
//    número devolvia o canal errado — número real, canal errado = mentira.

import { describe, it, expect } from "vitest";
import { extrairInscritosTexto, parseInscritos } from "@/lib/contador-inscritos-parse";

const HEADER = (handle: string, txt: string) =>
  `{"pageHeaderRenderer":{"content":{"metadataParts":[{"text":{"content":"@${handle}"}},{"text":{"content":"${txt}"}}]}}}`;

const SUGESTOES = `"subscriberCountText":{"simpleText":"847 mil de inscritos"}`;

describe("contador de inscritos — número certo do canal certo", () => {
  it("pega a contagem do canal pedido, não a da lateral", () => {
    const html = SUGESTOES + HEADER("felipeneto", "48 mi de inscritos");
    expect(extrairInscritosTexto(html, "felipeneto")).toContain("48 mi");
  });

  it("não depende de maiúscula/minúscula no @ do canal", () => {
    const html = HEADER("NatGeo", "26,3 mi de inscritos");
    expect(extrairInscritosTexto(html, "natgeo")).toContain("26,3 mi");
  });

  it("cai no cabeçalho quando o @ não bate exatamente", () => {
    const html = HEADER("outronome", "14,4 mi de inscritos");
    expect(extrairInscritosTexto(html, "google")).toContain("14,4 mi");
  });

  it("lê canal em inglês", () => {
    expect(extrairInscritosTexto(HEADER("mrbeast", "510M subscribers"), "mrbeast")).toContain("510M");
  });

  it("não inventa número quando não há contagem na página", () => {
    expect(extrairInscritosTexto("<html><body>sem contagem</body></html>", "alguem")).toBeNull();
  });

  it("converte as abreviações do YouTube", () => {
    expect(parseInscritos("30,1 mi")).toBe(30_100_000);
    expect(parseInscritos("980 mil")).toBe(980_000);
    expect(parseInscritos("442M")).toBe(442_000_000);
    expect(parseInscritos("1,2 B")).toBe(1_200_000_000);
    expect(parseInscritos("847")).toBe(847);
  });
});
