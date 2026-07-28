// v331 — Auditoria de Promessa × Catálogo (runtime).
// Lê o catálogo real por rede e confronta com o texto público (FAQ e
// depoimentos). Se o site promete BR ou reposição que a rede não tem, vira
// achado da auditoria forense — mesmo caminho de alerta em português.

import { FAQS } from "@/components/FaqSection";
import { REVIEWS_BY_ROUTE } from "@/components/ReviewsCarousel";
import {
  checkPromiseCoherence,
  pacoteEhBr,
  redeDaCategoria,
  type PromiseViolation,
} from "@/lib/promise-coherence";

const ROTA_POR_REDE: Record<string, keyof typeof REVIEWS_BY_ROUTE> = {
  instagram: "/",
  tiktok: "/tiktok",
  youtube: "/youtube",
  facebook: "/facebook",
  telegram: "/telegram",
  trafego: "/trafego",
  kwai: "/kwai",
};

/** Fatos reais do catálogo por rede (fonte da verdade das promessas). */
export async function loadCatalogFacts(): Promise<
  Map<string, { hasBr: boolean; hasRefill: boolean }>
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const facts = new Map<string, { hasBr: boolean; hasRefill: boolean }>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (supabaseAdmin as any)
      .from("pricing_items")
      .select("pacote, category, is_sellable, refill_supported")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<any>;
    for (const r of rows) {
      if (r.is_sellable === false) continue; // pausado não é promessa vendável
      const rede = redeDaCategoria(String(r.category));
      const cur = facts.get(rede) ?? { hasBr: false, hasRefill: false };
      if (pacoteEhBr(String(r.pacote), String(r.category))) cur.hasBr = true;
      if (r.refill_supported === true) cur.hasRefill = true;
      facts.set(rede, cur);
    }
    if (rows.length < PAGE) break;
  }
  return facts;
}

// v338 — PONTO CEGO FECHADO: até aqui o detector só lia FAQ e depoimentos das
// 7 rotas de rede. As ~15 landings de SEO têm copy própria (intro, benefícios,
// bodySections, FAQ local) e NUNCA foram medidas — foi lá que apareceu
// "garantia de 30 dias nos pacotes brasileiros" numa página de YouTube global.
// Agora o código-fonte das rotas entra na varredura como texto.
const FONTES_ROTAS = import.meta.glob("/src/routes/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Rede de uma landing pelo nome do arquivo. */
export function redeDaRota(arquivo: string): string | null {
  const nome = arquivo.split("/").pop()?.replace(/\.tsx$/, "") ?? "";
  if (/tiktok/i.test(nome)) return "tiktok";
  if (/youtube/i.test(nome)) return "youtube";
  if (/kwai/i.test(nome)) return "kwai";
  if (/facebook/i.test(nome)) return "facebook";
  if (/telegram/i.test(nome)) return "telegram";
  if (/trafego/i.test(nome)) return "trafego";
  if (/instagram|seguidores|curtidas|brasileir|pix|engajamento|impulsionar|audiencia|promo/i.test(nome))
    return "instagram";
  return null;
}

/** Só frases de copy: literais longos em português, sem cara de código. */
export function textosDeCopy(fonte: string): string[] {
  const out: string[] = [];
  const re = /"([^"\\\n]{28,400})"|'([^'\\\n]{28,400})'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fonte))) {
    const s = (m[1] ?? m[2] ?? "").trim();
    if (!/\s/.test(s)) continue;
    if (/^[\w:@/.$#-]+$/.test(s)) continue;          // classes, urls, ids
    if (/[{}<>]|=>|className|https?:\/\//.test(s)) continue;
    if (!/[áàâãéêíóôõúçA-Z]/.test(s)) continue;
    out.push(s);
  }
  return out;
}

export async function runPromiseCoherence(): Promise<PromiseViolation[]> {
  const facts = await loadCatalogFacts();

  const out: PromiseViolation[] = [];
  for (const [rede, f] of facts) {
    const rota = ROTA_POR_REDE[rede];
    if (!rota) continue;
    const textos: Array<{ origem: string; texto: string }> = [];
    for (const item of FAQS[rede] ?? []) {
      textos.push({ origem: `FAQ /${rede}`, texto: `${item.q} ${item.a}` });
    }
    for (const rev of REVIEWS_BY_ROUTE[rota] ?? []) {
      textos.push({ origem: `Depoimento ${rota} (${rev.n})`, texto: rev.t });
    }
    out.push(...checkPromiseCoherence({ network: rede, facts: f, textos }));
  }

  // v338 — copy das landings de SEO (fonte das rotas).
  for (const [arquivo, fonte] of Object.entries(FONTES_ROTAS)) {
    const rede = redeDaRota(arquivo);
    if (!rede) continue;
    const f = facts.get(rede);
    if (!f) continue;
    const pagina = arquivo.split("/").pop()?.replace(/\.tsx$/, "") ?? arquivo;
    const textos = textosDeCopy(fonte).map((texto) => ({
      origem: `Página /${pagina === "index" ? "" : pagina}`,
      texto,
    }));
    out.push(...checkPromiseCoherence({ network: rede, facts: f, textos }));
  }

  return out;
}
