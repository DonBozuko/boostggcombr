// Helper para email opcional no checkout. Se usuário digitar um email válido,
// usa ele — senão, cai num fallback "@<rede>.eliteboostprime.com" pra não
// travar o pedido (backend exige email válido).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function resolveCheckoutEmail(raw: string, network: string): string {
  const trimmed = (raw || "").trim().toLowerCase();
  if (trimmed && EMAIL_RE.test(trimmed)) return trimmed;
  return `cliente@${network}.eliteboostprime.com`;
}

export function isValidEmailOrEmpty(raw: string): boolean {
  const trimmed = (raw || "").trim();
  return trimmed === "" || EMAIL_RE.test(trimmed);
}
