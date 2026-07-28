import { describe, it, expect } from "vitest";
import { extrairTextoVisivel, redeDaRota } from "@/lib/surface-text";
import { rotasNaoDeclaradas, FAMILIAS } from "@/lib/coverage-map";
import { checkPromiseCoherence } from "@/lib/promise-coherence";

describe("v332 — varredura de superfície", () => {
  it("ignora rotas administrativas e mapeia rede pela rota", () => {
    expect(redeDaRota("/src/routes/admin.tsx")).toBeNull();
    expect(redeDaRota("/src/routes/api/x.tsx")).toBeNull();
    expect(redeDaRota("/src/routes/kwai.tsx")).toBe("kwai");
    expect(redeDaRota("/src/routes/comprar-visualizacoes-tiktok.tsx")).toBe("tiktok");
    expect(redeDaRota("/src/routes/index.tsx")).toBe("instagram");
  });

  it("extrai texto de venda e descarta código/atributos", () => {
    const src = `
import x from "y";
// comentário interno
export default function P() {
  const t = "Entregamos seguidores brasileiros reais em minutos.";
  return <p className="text-sm font-bold">Reposição garantida por 30 dias.</p>;
}`;
    const textos = extrairTextoVisivel(src);
    expect(textos.some((t) => /brasileiros reais/.test(t))).toBe(true);
    expect(textos.some((t) => /Reposição garantida/.test(t))).toBe(true);
    expect(textos.some((t) => /text-sm/.test(t))).toBe(false);
    expect(textos.some((t) => /comentário interno/.test(t))).toBe(false);
  });

  it("pega promessa no corpo da página, não só no FAQ", () => {
    const textos = extrairTextoVisivel(
      `<h2>Seguidores brasileiros reais para o seu Kwai</h2>`,
    ).map((texto) => ({ origem: "Página /kwai", texto }));
    const v = checkPromiseCoherence({
      network: "kwai",
      facts: { hasBr: false, hasRefill: false },
      textos,
    });
    expect(v.some((x) => x.kind === "br")).toBe(true);
  });

  it("acusa rota pública nova que ninguém declarou no mapa", () => {
    expect(rotasNaoDeclaradas(["index", "kwai"])).toHaveLength(0);
    expect(rotasNaoDeclaradas(["rota-nova-sem-detector"])).toEqual([
      "rota-nova-sem-detector",
    ]);
  });

  it("mapa de cobertura declara explicitamente o que não tem detector", () => {
    expect(FAMILIAS.every((f) => f.detector !== null)).toBe(true);
    expect(FAMILIAS.every((f) => f.id && f.nome)).toBe(true);
  });
});
