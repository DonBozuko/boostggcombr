import { describe, it, expect } from "vitest";
import { checkVisualCoherence, extrairImagens, referenciasPublicas } from "@/lib/asset-coherence";
import { checkEmailCoherence } from "@/lib/email-coherence";
import { FAMILIAS } from "@/lib/coverage-map";

describe("v333 — provas visuais das landings", () => {
  it("acusa arquivo local referenciado que não existe", () => {
    const v = checkVisualCoherence({
      origem: "Página /kwai",
      source: `<img src="/assets/prova-kwai.png" alt="Resultado real" />`,
      arquivosExistentes: new Set(["/favicon.svg"]),
    });
    expect(v.some((x) => x.kind === "arquivo_ausente")).toBe(true);
  });

  it("não acusa arquivo que existe", () => {
    const v = checkVisualCoherence({
      origem: "Página /",
      source: `<img src="/favicon.svg" alt="Logo" />`,
      arquivosExistentes: new Set(["/favicon.svg"]),
    });
    expect(v).toHaveLength(0);
  });

  it("acusa imagem sem descrição e aceita alt vazio decorativo", () => {
    const semAlt = checkVisualCoherence({
      origem: "Página /x",
      source: `<img src={qr} className="w-4" />`,
      arquivosExistentes: new Set(),
    });
    expect(semAlt.some((x) => x.kind === "sem_alt")).toBe(true);

    const decorativa = checkVisualCoherence({
      origem: "Página /x",
      source: `<img src={qr} alt="" />`,
      arquivosExistentes: new Set(),
    });
    expect(decorativa).toHaveLength(0);
  });

  it("acusa descrição de imagem prometendo BR/reposição sem catálogo", () => {
    const v = checkVisualCoherence({
      origem: "Página /telegram",
      source: `<img src={p} alt="Membros brasileiros com reposição garantida por 30 dias" />`,
      facts: { hasBr: false, hasRefill: false },
      arquivosExistentes: new Set(),
    });
    expect(v.filter((x) => x.kind === "alt_promete_demais").length).toBe(2);
  });

  it("extrai imagens e referências públicas do código", () => {
    expect(extrairImagens(`<Img src="/a.png" alt="oi" />`)).toHaveLength(1);
    expect(referenciasPublicas(`const v = "/assets/videos/x.mp4";`)).toEqual([
      "/assets/videos/x.mp4",
    ]);
  });
});

describe("v333 — e-mails transacionais", () => {
  const facts = { hasBr: true, hasRefill: false };

  it("acusa promessa de reposição que o catálogo não tem", () => {
    const v = checkEmailCoherence({
      template: "review-request",
      source: `<Text>Seu pedido tem reposição garantida por 30 dias.</Text>`,
      facts,
    });
    expect(v.some((x) => x.kind === "promete_demais")).toBe(true);
  });

  it("acusa lacuna não preenchida vazando para o cliente", () => {
    const v = checkEmailCoherence({
      template: "cart-recovery",
      source: `<Text>Oi {{nome}}, seu Pix ficou pendente aqui no site.</Text>`,
      facts,
    });
    expect(v.some((x) => x.kind === "lacuna_nao_preenchida")).toBe(true);
  });

  it("não acusa e-mail correto", () => {
    const v = checkEmailCoherence({
      template: "refund-notice",
      source: `<Text>Seu reembolso foi enviado e cai em ate 1 dia util.</Text>`,
      facts,
    });
    expect(v).toHaveLength(0);
  });
});

describe("v333 — mapa de cobertura fechado", () => {
  it("não sobra família sem detector", () => {
    expect(FAMILIAS.filter((f) => f.detector === null)).toHaveLength(0);
  });
});
