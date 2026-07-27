// v301 — PREFLIGHT DE ALVO (decisão pura).
//
// Por que existe: a v297 provou que a ROTA existe (fornecedor, ID, saldo,
// margem). Mas o reembolso real de R$ 283,44 (pedido p15k, 26/07) não foi
// falha de rota — foi ALVO inválido: o cliente colou
// `instagram.com/hstrader82?igsh=...` e os 3 fornecedores devolveram
// "Unable to verify your domain submission". Perfil inexistente ou privado é
// recusado por TODO painel SMM, então cobrar antes de conferir o alvo é
// garantir estorno.
//
// Regra: para pacotes de SEGUIDORES de Instagram (perfil, não post), o perfil
// precisa existir e estar público ANTES de gerar a cobrança.
//
// Puro de propósito: sem rede/banco, testável, ponto único de verdade.

export type TargetCheck =
  | { ok: true }
  | { ok: false; code: "PROFILE_NOT_FOUND" | "PROFILE_PRIVATE" };

export type ProfileLookup =
  | { ok: true; privado: boolean }
  | { ok: false };

/**
 * Só validamos o que dá pra validar com certeza: perfil de Instagram.
 * Post/vídeo/canal não têm checagem pública confiável — nesses casos o
 * preflight de alvo não opina (deixa o despacho decidir).
 */
export function requiresProfileCheck(rede: string, pacote: string): boolean {
  if (String(rede).toLowerCase() !== "instagram") return false;
  const p = String(pacote).toLowerCase().replace(/^br-/, "");
  // "p*" = seguidores de perfil no catálogo (p100, p15k...). Curtidas ("l*"),
  // views ("v*") e comentários apontam para POST, não para perfil.
  return /^p\d/.test(p);
}

/** Extrai o @ canônico de qualquer coisa que o cliente cole. */
export function extractInstagramHandle(raw: string): string | null {
  const h = String(raw ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^(m\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/[/?#].*$/, "")
    .trim()
    .toLowerCase();
  if (!h || !/^[a-z0-9._]{1,30}$/.test(h)) return null;
  return h;
}

export function evaluateTarget(lookup: ProfileLookup): TargetCheck {
  if (!lookup.ok) return { ok: false, code: "PROFILE_NOT_FOUND" };
  if (lookup.privado) return { ok: false, code: "PROFILE_PRIVATE" };
  return { ok: true };
}
