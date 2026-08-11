/**
 * v617 — Utilitário de Sanitização Preventiva (Antidote Lite).
 * Remove caracteres de controle invisíveis (U+2063, U+200B, U+FEFF)
 * que não possuem significado semântico no conteúdo do projeto.
 */
export function sanitizeText(str: string | null | undefined): string {
  if (!str) return "";
  // Substitui apenas os caracteres alvo, preservando espaços e pontuação legítima.
  return str.replace(/[\u2063\u200B\uFEFF]/g, "");
}
