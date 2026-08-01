// v399 — legenda de reserva quando a IA não responde. Lógica pura.
export type Legenda = { titulo: string; texto: string; cta: string; hashtags: string };

export const FALLBACK_HASHTAGS =
  "#instagram #reels #creator #marketingdigital #dicasdeinstagram #crescernoinsta #engajamento #contentcreator";

export function localFallback(tema: string): Legenda {
  return {
    titulo: "Para aí 👀",
    texto: `${tema}\n\nSalva esse post pra não perder. Marca alguém que precisa ver.`,
    cta: "Curte, compartilha e comenta 🔥",
    hashtags: FALLBACK_HASHTAGS,
  };
}
