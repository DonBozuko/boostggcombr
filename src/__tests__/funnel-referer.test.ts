// v365 — INVARIANTE: o medidor de funil não pode descartar o cliente real.
//
// Regressão real: o endpoint usava `isInternalTraffic(referer)`. Como o beacon
// sai da própria página, o Referer é o próprio domínio → 100% dos eventos eram
// jogados fora. O painel ficou zerado por dias parecendo "ninguém acessa".
import { describe, expect, it } from "vitest";
import { isInternalTraffic, isOwnerPreviewTraffic } from "@/lib/traffic-source";

describe("v365 — telemetria de dentro da página", () => {
  it("cliente real no site publicado NÃO é descartado", () => {
    expect(isOwnerPreviewTraffic("https://www.boostgg.com.br/")).toBe(false);
    expect(isOwnerPreviewTraffic("https://boostgg.com.br/comprar-seguidores-instagram")).toBe(false);
  });

  it("editor/preview continua sendo descartado", () => {
    expect(isOwnerPreviewTraffic("https://id-preview--abc.lovable.app/")).toBe(true);
    expect(isOwnerPreviewTraffic("https://lovable.dev/projects/x")).toBe(true);
  });

  it("classificação de visita (outro uso) segue tratando o próprio site como interno", () => {
    expect(isInternalTraffic("https://boostgg.com.br/")).toBe(true);
  });
});
