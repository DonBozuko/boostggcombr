// v379 — Contador de inscritos do YouTube.
//
// Fonte: página pública do canal (mesma que qualquer visitante vê). Sem API key,
// sem login, sem dado privado. Se o YouTube não devolver o número, dizemos que
// não conseguimos ler — nunca inventamos.
//
// v380 — o YouTube troca o formato do JSON embutido sem avisar. Por isso a
// leitura tenta vários caminhos antes de desistir (foi assim que o contador
// quebrou silenciosamente na primeira versão).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  canal: z
    .string()
    .min(1)
    .max(80)
    .transform((s) => s.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, ""))
    .refine((s) => /^[A-Za-z0-9._\-]+$/.test(s), "Nome de canal inválido"),
});

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Acha o texto da contagem no HTML público do canal. */
export function extrairInscritosTexto(html: string): string | null {
  const paths = [
    /"subscriberCountText":\{"simpleText":"([^"]+)"/,
    /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/,
    /"subscriberCountText":"([^"]+)"/,
    /"content":"([\d.,]+\s*(?:mi|mil|k|m|b)?\s*(?:de\s*)?(?:inscritos|subscribers))"/i,
    /([\d.,]+\s*(?:mi|mil|k|m|b)?\s*(?:de\s*)?(?:inscritos|subscribers))/i,
  ];
  for (const re of paths) {
    const m = html.match(re)?.[1];
    if (m) return m.trim();
  }
  return null;
}

/** "30,1 mi" / "1,38 mi" / "980 mil" → número aproximado. */
export function parseInscritos(txt: string): number | null {
  const m = txt.match(/([\d.,]+)\s*(mi|mil|k|m|b)?/i);
  if (!m) return null;
  const base = Number(m[1]!.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(base)) return null;
  const suf = (m[2] ?? "").toLowerCase();
  if (suf === "b") return Math.round(base * 1_000_000_000);
  if (suf === "mi" || suf === "m") return Math.round(base * 1_000_000);
  if (suf === "mil" || suf === "k") return Math.round(base * 1_000);
  return Math.round(base);
}

export const contarInscritos = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`https://www.youtube.com/@${encodeURIComponent(data.canal)}`, {
        headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { ok: false as const, error: "NOT_FOUND" as const };
      const html = await res.text();

      const subTxt = extrairInscritosTexto(html);
      const nome =
        html.match(/"title":"([^"]+)","description"/)?.[1] ??
        html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ??
        null;
      if (!subTxt && !nome) return { ok: false as const, error: "NOT_FOUND" as const };

      const avatar =
        html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/)?.[1] ??
        html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ??
        "";
      const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      const canal = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";

      return {
        ok: true as const,
        handle: data.canal,
        nome: nome ?? data.canal,
        avatar,
        descricao: desc.slice(0, 220),
        canonical: canal,
        inscritosTexto: subTxt ? subTxt.replace(/\s*de inscritos/i, "").trim() : null,
        inscritos: subTxt ? parseInscritos(subTxt) : null,
      };
    } catch (err) {
      console.error("[contarInscritos] erro:", err);
      return { ok: false as const, error: "TIMEOUT" as const };
    }
  });
