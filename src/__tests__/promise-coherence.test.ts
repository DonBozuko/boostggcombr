import { describe, it, expect } from "vitest";
import {
  checkPromiseCoherence,
  pacoteEhBr,
  redeDaCategoria,
} from "@/lib/promise-coherence";

const semNada = { hasBr: false, hasRefill: false };
const comTudo = { hasBr: true, hasRefill: true };

describe("v331 — promessa × catálogo", () => {
  it("acusa promessa de perfil brasileiro em rede sem linha BR", () => {
    const v = checkPromiseCoherence({
      network: "kwai",
      facts: semNada,
      textos: [{ origem: "faq", texto: "Entregamos seguidores brasileiros reais." }],
    });
    expect(v.some((x) => x.kind === "br")).toBe(true);
  });

  it("acusa promessa de reposição em rede sem refill", () => {
    const v = checkPromiseCoherence({
      network: "telegram",
      facts: semNada,
      textos: [{ origem: "faq", texto: "A reposição é garantida por 30 dias." }],
    });
    expect(v.some((x) => x.kind === "refill")).toBe(true);
  });

  it("acusa 'sem drop' em depoimento de rede sem refill", () => {
    const v = checkPromiseCoherence({
      network: "tiktok",
      facts: { hasBr: true, hasRefill: false },
      textos: [{ origem: "review", texto: "Seguidores consistentes, sem drop nos 30 dias." }],
    });
    expect(v.map((x) => x.kind)).toContain("refill");
  });

  it("não acusa quando o texto NEGA a promessa", () => {
    const v = checkPromiseCoherence({
      network: "kwai",
      facts: semNada,
      textos: [
        { origem: "faq", texto: "Não temos pacotes brasileiros no Kwai hoje." },
        { origem: "faq", texto: "Nos pacotes Global não há reposição garantida." },
      ],
    });
    expect(v).toHaveLength(0);
  });

  it("não acusa promessa verdadeira", () => {
    const v = checkPromiseCoherence({
      network: "instagram",
      facts: comTudo,
      textos: [{ origem: "faq", texto: "Nos pacotes Brasileiro Real a reposição é garantida por 30 dias." }],
    });
    expect(v).toHaveLength(0);
  });

  it("wbr (tráfego geo) não conta como pacote brasileiro", () => {
    expect(pacoteEhBr("wbr1000", "trafego:br")).toBe(false);
    expect(pacoteEhBr("br-tf500", "instagram:seguidores")).toBe(true);
    expect(redeDaCategoria("telegram:canal")).toBe("telegram");
  });
});
