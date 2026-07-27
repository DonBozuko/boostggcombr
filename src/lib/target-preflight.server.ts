// v301 — PREFLIGHT DE ALVO (execução).
//
// Fail-open por princípio: se o Instagram não responder em 5s, ou responder
// coisa estranha, a venda passa. Nunca perdemos venda por instabilidade nossa.
// Fail-closed só com veredito real: perfil não existe ou está privado.

import {
  evaluateTarget,
  extractInstagramHandle,
  requiresProfileCheck,
  type TargetCheck,
} from "./target-preflight";

const TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 120_000;

const cache = new Map<string, { at: number; result: TargetCheck }>();

const PASS: TargetCheck = { ok: true };

async function lookupInstagram(handle: string) {
  const res = await fetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    {
      headers: {
        "x-ig-app-id": "936619743392459",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  // 404 = perfil não existe (veredito). Qualquer outro erro (429/5xx/bloqueio)
  // é instabilidade do Instagram → fail-open.
  if (res.status === 404) return { ok: false as const };
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { user?: { is_private?: boolean } | null };
  };
  const u = json?.data?.user;
  if (u === null) return { ok: false as const };
  if (!u) return null;
  return { ok: true as const, privado: !!u.is_private };
}

export async function preflightTargetOrBlock(opts: {
  rede: string;
  pacote: string;
  alvo: string;
}): Promise<TargetCheck> {
  if (!requiresProfileCheck(opts.rede, opts.pacote)) return PASS;

  const handle = extractInstagramHandle(opts.alvo);
  // Handle irreconhecível: não inventamos veredito aqui — a validação de
  // formato do checkout já cuida disso.
  if (!handle) return PASS;

  const hit = cache.get(handle);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  let lookup: Awaited<ReturnType<typeof lookupInstagram>>;
  try {
    lookup = await lookupInstagram(handle);
  } catch (err) {
    console.warn(`[v301] checagem de perfil indisponível (@${handle}) — liberando venda:`, err);
    return PASS;
  }
  if (!lookup) return PASS;

  const result = evaluateTarget(lookup);
  cache.set(handle, { at: Date.now(), result });
  if (!result.ok) {
    console.error(`[v301] COBRANÇA BLOQUEADA — alvo inválido @${handle}: ${result.code}`);
  }
  return result;
}
