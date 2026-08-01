import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localFallback, FALLBACK_HASHTAGS, type Legenda } from "@/lib/gerador-legenda-fallback";

const TONES = ["persuasivo", "engracado", "inspirador", "profissional", "polemico", "romantico"] as const;
const OBJETIVOS = ["engajamento", "vendas", "seguidores", "autoridade", "trafego"] as const;

const input = z.object({
  tema: z.string().trim().min(3, "Descreva o post em pelo menos 3 caracteres").max(400),
  tom: z.enum(TONES).default("persuasivo"),
  objetivo: z.enum(OBJETIVOS).default("engajamento"),
  incluirEmojis: z.boolean().default(true),
  incluirHashtags: z.boolean().default(true),
});




export const gerarLegenda = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: true as const, source: "local" as const, legendas: [localFallback(data.tema)] };

    const prompt = `Gere 3 LEGENDAS DIFERENTES em português BR para um post de Instagram.

TEMA: ${data.tema}
TOM: ${data.tom}
OBJETIVO: ${data.objetivo}
EMOJIS: ${data.incluirEmojis ? "sim, usar com moderação" : "não usar"}
HASHTAGS: ${data.incluirHashtags ? "incluir 8-12 hashtags relevantes em português BR ao final" : "não incluir"}

Cada legenda deve ter:
- titulo: gancho de abertura chocante e curto (max 90 chars)
- texto: corpo persuasivo em 3-6 linhas, quebras de linha reais com \\n, sem clichê
- cta: chamada para ação clara (comentar, salvar, compartilhar ou link na bio)
- hashtags: string única com hashtags separadas por espaço, ou "" se não pedido

Retorne APENAS JSON estrito:
{"legendas":[{"titulo":"...","texto":"...","cta":"...","hashtags":"..."}, {...}, {...}]}`;

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.9,
          messages: [
            {
              role: "system",
              content:
                "Você é copywriter sênior de Instagram brasileiro. Escreve legendas persuasivas, inéditas, com ganchos fortes e CTAs claros. Responde SOMENTE em JSON válido.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));

      if (r.status === 429)
        return { ok: false as const, error: "RATE_LIMIT" as const, message: "Muitas requisições. Tente em 1 min." };
      if (r.status === 402)
        return { ok: false as const, error: "NO_CREDITS" as const, message: "Créditos de IA esgotados." };
      if (!r.ok) return { ok: true as const, source: "fallback" as const, legendas: [localFallback(data.tema)] };

      const j: unknown = await r.json();
      const raw = (j as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
      if (!raw) return { ok: true as const, source: "fallback" as const, legendas: [localFallback(data.tema)] };

      const parsed = JSON.parse(raw) as { legendas?: Legenda[] };
      const legendas = (parsed.legendas ?? [])
        .slice(0, 3)
        .map((l) => ({
          titulo: String(l.titulo ?? "").slice(0, 200),
          texto: String(l.texto ?? ""),
          cta: String(l.cta ?? ""),
          hashtags: data.incluirHashtags ? String(l.hashtags ?? FALLBACK_HASHTAGS) : "",
        }))
        .filter((l) => l.texto.length > 0);

      if (legendas.length === 0)
        return { ok: true as const, source: "fallback" as const, legendas: [localFallback(data.tema)] };
      return { ok: true as const, source: "ai" as const, legendas };
    } catch (err) {
      console.error("[gerarLegenda] erro:", err);
      return { ok: true as const, source: "fallback" as const, legendas: [localFallback(data.tema)] };
    }
  });
