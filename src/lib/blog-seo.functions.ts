import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * v605 — SEO Interlinking Engine.
 * Gera sugestões de links internos para o blog baseadas em tokens de contexto.
 */
const KEYWORD_MAP: Record<string, string> = {
  "seguidores brasileiros": "/comprar-seguidores-brasileiros",
  "seguidores instagram": "/comprar-seguidores-instagram",
  "seguidores no pix": "/seguidores-pix",
  "curtidas instagram": "/comprar-curtidas-instagram",
  "curtidas no instagram": "/comprar-curtidas-instagram",
  "seguidores tiktok": "/comprar-seguidores-tiktok",
  "inscritos youtube": "/comprar-inscritos-youtube",
};

export const getSmartInterlinks = createServerFn({ method: "GET" })
  .validator((input: { currentPath: string }) => z.object({ currentPath: z.string() }).parse(input))
  .handler(async ({ data }) => {
    // Lógica futura: Analisar conteúdo via ML ou tags.
    // Por enquanto, retorno estático baseado em cobertura de funnel.
    return Object.entries(KEYWORD_MAP)
      .filter(([_, path]) => path !== data.currentPath)
      .map(([keyword, path]) => ({ keyword, path }));
  });
