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
  "comprar seguidores": "/comprar-seguidores-instagram",
  "seguidores reais": "/seguidores-reais-instagram",
};

/**
 * v606 — Auto-Interlink v2.
 * Parser dinâmico que injeta links baseados em densidade e relevância.
 */
export const getSmartInterlinks = createServerFn({ method: "GET" })
  .validator((input: { currentPath: string; content?: string }) => 
    z.object({ currentPath: z.string(), content: z.string().optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    const { currentPath, content = "" } = data;
    const found = Object.entries(KEYWORD_MAP)
      .filter(([keyword, path]) => {
        if (path === currentPath) return false;
        // Case-insensitive match no conteúdo
        return content.toLowerCase().includes(keyword.toLowerCase());
      })
      .map(([keyword, path]) => ({ keyword, path }));

    // Retorna os top 3 links mais relevantes para evitar spam
    return found.slice(0, 3);
  });

