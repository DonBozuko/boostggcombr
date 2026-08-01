// v399 — helpers de recarga de fornecedor (leem process.env → server-only).
export const PAINEL_URL: Record<string, string> = {
  smmhype: "https://smmhype.com",
  smmpainel: "https://smmpainel.com",
  smmpanel: "https://smmpainel.com",
  verified: "https://verifiedatacado.com",
};

/** Origem do api_url = painel do fornecedor (script SMM padrão). */
export function painelFromApiUrl(apiUrl: string | null | undefined): string | null {
  const raw = String(apiUrl ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function pixFor(slug: string): string | null {
  const s = (slug || "").toLowerCase();
  if (s.includes("smmhype")) return process.env.SMMHYPE_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("smmpainel") || s.includes("smmpanel")) return process.env.SMMPANEL_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("verified")) return process.env.VERIFIED_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("provider4") || s.includes("smmoficial")) return process.env.PROVIDER4_PIX_COPIA_COLA?.trim() || null;
  return process.env.PROVIDER_PIX_COPIA_COLA?.trim() || null;
}
