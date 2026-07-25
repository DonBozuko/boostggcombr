import { describe, expect, it } from "vitest";
import { classifyTrafficSource, isInternalTraffic } from "@/lib/traffic-source";

describe("origem de tráfego — trava anti-inflação de visitas", () => {
  it("descarta editor/preview/próprio site", () => {
    for (const r of [
      "https://lovable.dev/projects/x",
      "https://id-preview--abc.lovable.app/",
      "https://boostggcombr.lovable.app/",
      "https://www.boostgg.com.br/comprar-seguidores-instagram",
    ]) {
      expect(isInternalTraffic(r)).toBe(true);
    }
  });

  it("mantém visita externa real", () => {
    expect(isInternalTraffic("https://www.google.com/")).toBe(false);
    expect(isInternalTraffic(null)).toBe(false);
  });

  it("rotula IA separadamente da busca", () => {
    expect(classifyTrafficSource(null, "https://chatgpt.com/c/1")).toBe("ChatGPT (IA)");
    expect(classifyTrafficSource(null, "https://www.perplexity.ai/x")).toBe("Perplexity (IA)");
    expect(classifyTrafficSource(null, "https://www.google.com/")).toBe("busca: google.com");
    expect(classifyTrafficSource(null, "https://www.bing.com/")).toBe("busca: bing.com");
  });

  it("sem referrer é direto, e utm tem prioridade sobre host genérico", () => {
    expect(classifyTrafficSource(null, null)).toBe("direto");
    expect(classifyTrafficSource("instagram_bio", "https://t.co/x")).toBe("instagram_bio");
  });
});
