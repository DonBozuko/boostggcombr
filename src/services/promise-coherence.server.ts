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

export async function runPromiseCoherence(): Promise<PromiseViolation[]> {
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
  return out;
}
