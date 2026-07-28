// v312 — IMPRESSÃO DIGITAL DO SERVIÇO (função pura, testável).
//
// Problema real: o fornecedor mantém o mesmo ID mas TROCA o produto por trás
// ("Instagram Followers BR" vira "Instagram Likes"). Nenhuma trava por ID pega
// isso — o ID continua existindo e o teste seco continua passando. O cliente
// paga seguidor e recebe curtida; o dinheiro vira estorno.
//
// Solução: no momento do vínculo gravamos a "assinatura" do nome do serviço.
// A cada auditoria comparamos com o nome atual do fornecedor. Se a assinatura
// mudou, o vínculo é considerado podre e é desligado antes de vender.

// Tokens que definem O QUE o serviço entrega. Mudança de qualquer um deles é
// troca de produto. Palavra de marketing ("fast", "cheap", "new", "2024") não
// entra: fornecedor renomeia isso toda semana e não é motivo para desvincular.
const CORE_TOKENS: Array<{ token: string; re: RegExp }> = [
  { token: "seguidores", re: /\b(follow\w*|seguidor\w*|subs?criber\w*|inscrit\w*|member\w*|membro\w*)/i },
  { token: "curtidas", re: /\b(like\w*|curtid\w*|reaction\w*|rea[cç][aã]o\w*)/i },
  { token: "visualizacoes", re: /\b(view\w*|visualiza\w*|watch\s*time|impress\w*)/i },
  { token: "comentarios", re: /\b(comment\w*|coment[aá]ri\w*)/i },
  { token: "compartilhamentos", re: /\b(share\w*|compartilh\w*|save\w*|salvament\w*)/i },
  { token: "live", re: /\b(live|ao\s*vivo)\b/i },
  { token: "short", re: /\b(short\w*|reel\w*)\b/i },
  { token: "story", re: /\b(stor(y|ies)|st[oó]ri\w*)\b/i },
  { token: "br", re: /\b(brazil\w*|brasil\w*|\bbr\b|portugu\w*)/i },
  { token: "instagram", re: /\binstagram|\big\b/i },
  { token: "tiktok", re: /\btik\s*tok\b/i },
  { token: "youtube", re: /\byou\s*tube|\byt\b/i },
  { token: "facebook", re: /\bfacebook|\bfb\b/i },
  { token: "twitter", re: /\btwitter|\bx\.com\b/i },
  { token: "kwai", re: /\bkwai\b/i },
  { token: "telegram", re: /\btelegram\b/i },
];

/** Assinatura estável do nome do serviço: só o que define o produto. */
export function serviceSignature(name: string): string {
  const n = String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hits = CORE_TOKENS.filter(({ re }) => re.test(n)).map(({ token }) => token);
  if (hits.length === 0) {
    // Sem token conhecido: cai para o nome cru normalizado. Melhor comparar algo
    // do que declarar "igual" e deixar troca silenciosa passar.
    return n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  return [...new Set(hits)].sort().join("+");
}

// v314 — nem todo token pesa igual. Só estes definem O QUE o cliente recebe e
// em qual rede. Mudança neles = produto diferente (desvincula). Mudança em
// "br", "fast", "story" e afins é rótulo do fornecedor, não troca de produto.
const INTENT_CORE = new Set([
  "seguidores",
  "curtidas",
  "visualizacoes",
  "comentarios",
  "compartilhamentos",
  "live",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "twitter",
  "kwai",
  "telegram",
]);

/** Só a parte da assinatura que define produto+rede. */
export function intentSignature(sigOrName: string): string {
  const sig = sigOrName.includes("+") || INTENT_CORE.has(sigOrName) ? sigOrName : serviceSignature(sigOrName);
  return sig
    .split("+")
    .filter((t) => INTENT_CORE.has(t))
    .sort()
    .join("+");
}

export type FingerprintRecord = {
  pacote: string;
  col: string;
  provider: string;
  service_id: string;
  service_name: string;
  name_sig: string;
};

export type FingerprintLink = {
  pacote: string;
  col: string;
  provider: string;
  service_id: string;
  /** Nome atual do serviço no cache do fornecedor. null = não encontrado. */
  current_name: string | null;
  /** v314 — categoria declarada do pacote, para validar o baseline. */
  category?: string | null;
};

export type FingerprintDecision =
  | { action: "baseline"; link: FingerprintLink; sig: string }
  | { action: "ok"; link: FingerprintLink }
  | { action: "rename"; link: FingerprintLink; sig: string }
  | { action: "unknown"; link: FingerprintLink }
  | { action: "suspect"; link: FingerprintLink; motivo: string }
  | { action: "drift"; link: FingerprintLink; from: string; to: string; sig: string };

/**
 * Compara os vínculos atuais com as impressões digitais gravadas.
 * v314:
 * - baseline não é mais confiança cega: só grava se o nome do fornecedor bater
 *   com a intenção declarada do pacote; se não bater nasce "suspect";
 * - drift só desvincula quando muda token de intenção; nome novo com a mesma
 *   intenção vira "rename" (atualiza a assinatura, mantém o vínculo).
 */
export function decideFingerprints(
  links: FingerprintLink[],
  stored: Map<string, FingerprintRecord>,
  matchesIntent?: (category: string | null | undefined, name: string) => boolean,
): FingerprintDecision[] {
  const out: FingerprintDecision[] = [];
  for (const link of links) {
    if (!link.current_name) {
      out.push({ action: "unknown", link });
      continue;
    }
    const sig = serviceSignature(link.current_name);
    const prev = stored.get(fingerprintKey(link.pacote, link.col));
    const novoVinculo = !prev || prev.service_id !== link.service_id || prev.provider !== link.provider;

    if (novoVinculo) {
      if (matchesIntent && link.category && !matchesIntent(link.category, link.current_name)) {
        out.push({
          action: "suspect",
          link,
          motivo: `serviço "${link.current_name}" não corresponde a ${link.category}`,
        });
        continue;
      }
      out.push({ action: "baseline", link, sig });
      continue;
    }
    if (prev!.name_sig === sig) {
      out.push({ action: "ok", link });
      continue;
    }
    if (intentSignature(prev!.name_sig) === intentSignature(sig)) {
      out.push({ action: "rename", link, sig });
      continue;
    }
    out.push({ action: "drift", link, from: prev!.service_name, to: link.current_name, sig });
  }
  return out;
}


export function fingerprintKey(pacote: string, col: string): string {
  return `${pacote}|${col}`;
}

// v313 — versão de 1 vínculo, para usar no ato da venda (roteamento/despacho).
// true = o fornecedor trocou o produto por trás do mesmo ID: não pode vender.
export function productChanged(
  currentName: string | null | undefined,
  prev: Pick<FingerprintRecord, "provider" | "service_id" | "name_sig"> | undefined | null,
  link: { provider: string; service_id: string },
): boolean {
  if (!currentName || !prev) return false;
  if (prev.provider !== link.provider || prev.service_id !== link.service_id) return false;
  return prev.name_sig !== serviceSignature(currentName);
}

