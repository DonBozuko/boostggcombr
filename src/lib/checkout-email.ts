// v315 — E-mail do cliente virou obrigatório no checkout.
//
// CAUSA RAIZ: antes o campo era "opcional" e, quando vazio, o front gravava
// um endereço falso (cliente@<rede>.eliteboostprime.com) só para o backend
// aceitar o pedido. Resultado: 74 de 75 pedidos ficaram sem contato real,
// o e-mail de carrinho abandonado nunca disparou e todo Pix não pago virou
// dinheiro perdido em silêncio. Sem contato não existe recuperação.
//
// Regra agora: sem e-mail válido, não gera pedido.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domínio do fallback falso antigo. Mantido só para o backend descartar histórico. */
export const FAKE_EMAIL_DOMAIN = "eliteboostprime.com";

export function isFakeCheckoutEmail(raw: string | null | undefined): boolean {
  const e = String(raw ?? "").trim().toLowerCase();
  return !e || e.endsWith(FAKE_EMAIL_DOMAIN) || e.endsWith("@webhook") || e.includes("anonimizado");
}

/** Normaliza o e-mail digitado. Retorna null se não for utilizável. */
export function normalizeCheckoutEmail(raw: string): string | null {
  const trimmed = (raw || "").trim().toLowerCase();
  if (!trimmed || !EMAIL_RE.test(trimmed)) return null;
  if (trimmed.endsWith(FAKE_EMAIL_DOMAIN)) return null;
  return trimmed;
}

/** Mensagem de erro para exibir no checkout, ou null quando está ok. */
export function checkoutEmailError(raw: string): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "Informe seu e-mail para receber o comprovante e o status do pedido.";
  if (!EMAIL_RE.test(trimmed)) return "E-mail inválido. Confira e tente de novo.";
  if (trimmed.toLowerCase().endsWith(FAKE_EMAIL_DOMAIN)) return "Use seu e-mail pessoal.";
  return null;
}
