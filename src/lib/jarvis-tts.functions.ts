import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// v400 — Narração IA para o Copy Studio.
// Módulo fino: só imports, schema e a server function exportada.
const VOZES = ["onyx", "ash", "alloy", "nova", "shimmer", "echo"] as const;

const input = z.object({
  texto: z.string().trim().min(3, "Texto muito curto").max(1500),
  voz: z.enum(VOZES).default("onyx"),
});

export const gerarNarracao = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "NO_KEY" as const, message: "Narração indisponível: chave de IA ausente." };
    }

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45000);
      const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini-tts",
          input: data.texto,
          voice: data.voz,
          response_format: "mp3",
          instructions:
            "Fale em português do Brasil, ritmo acelerado de creator de Reels, tom confiante e persuasivo, sem soar robótico.",
        }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));

      if (r.status === 429)
        return { ok: false as const, error: "RATE_LIMIT" as const, message: "Muitas requisições de narração. Tente em 1 minuto." };
      if (r.status === 402)
        return { ok: false as const, error: "NO_CREDITS" as const, message: "Créditos de IA esgotados. Recarregue para gerar narração." };
      if (!r.ok) {
        const detalhe = await r.text().catch(() => "");
        console.error("[gerarNarracao] upstream", r.status, detalhe.slice(0, 300));
        return { ok: false as const, error: "UPSTREAM" as const, message: `Falha na narração (${r.status}).` };
      }

      const buf = await r.arrayBuffer();
      if (buf.byteLength < 1024)
        return { ok: false as const, error: "EMPTY" as const, message: "A IA devolveu áudio vazio. Tente de novo." };

      return {
        ok: true as const,
        mime: "audio/mpeg" as const,
        base64: Buffer.from(buf).toString("base64"),
        bytes: buf.byteLength,
      };
    } catch (err) {
      console.error("[gerarNarracao] erro:", err);
      return { ok: false as const, error: "NETWORK" as const, message: "Não consegui falar com a IA de voz agora." };
    }
  });
