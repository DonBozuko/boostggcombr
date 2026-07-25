// v242 — DROP WATCHER (Reposição automática)
//
// Problema real (caso Sybele): seguidor entregue cai dias depois e ninguém repõe.
// Os 3 fornecedores expõem `action=refill` na API v2. Serviços com garantia
// aceitam o pedido; os sem garantia devolvem erro — nesse caso registramos e,
// se for recorrente, o pacote é candidato a troca de fornecedor.
//
// Regra: 72h após a conclusão, pedimos reposição UMA vez por pedido (30 dias
// de janela do fornecedor). Nada é cobrado do cliente e nada é reembolsado aqui.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// v254 — endpoints/chaves lidos da tabela `fornecedores` (nada de lista fixa).
// Antes o robô só conhecia 3 slugs, então pedidos entregues pelo provider4
// (SMMOficial) nunca pediam reposição automática.
const FALLBACK_ENDPOINTS: Record<string, string> = {
  smmhype: "https://smmhype.com/api/v2",
  smmpainel: "https://smmpainel.com/api/v2",
  verified: "https://verifiedatacado.com/api/v2",
};

const FALLBACK_SECRETS: Record<string, string> = {
  smmhype: "SMMHYPE_API_KEY",
  smmpainel: "SMMPAINEL_API_KEY",
  verified: "VERIFIED_API_KEY",
  provider4: "PROVIDER4_API_KEY",
};

function normalizeApiUrl(raw: string): string {
  const u = raw.trim().replace(/\/+$/, "");
  return /\/api\//i.test(u) ? u : `${u}/api/v2`;
}

type ProviderCfg = { url: string; key: string | undefined };

async function loadProviderConfigs(): Promise<Record<string, ProviderCfg>> {
  const cfgs: Record<string, ProviderCfg> = {};
  for (const [slug, url] of Object.entries(FALLBACK_ENDPOINTS)) {
    cfgs[slug] = { url, key: process.env[FALLBACK_SECRETS[slug]] };
  }
  try {
    const { data } = await supabaseAdmin
      .from("fornecedores")
      .select("slug, api_url, api_key_secret, ativo");
    for (const f of ((data as any[]) ?? [])) {
      const slug = String(f.slug ?? "");
      if (!slug) continue;
      const secretName = String(f.api_key_secret ?? FALLBACK_SECRETS[slug] ?? "");
      cfgs[slug] = {
        url: f.api_url ? normalizeApiUrl(String(f.api_url)) : (cfgs[slug]?.url ?? ""),
        key: (secretName ? process.env[secretName] : undefined) ?? cfgs[slug]?.key,
      };
    }
  } catch { /* mantém fallback */ }
  return cfgs;
}


type RefillResp = { refill?: string | number; error?: string };

async function requestRefill(cfgs: Record<string, ProviderCfg>, slug: string, orderId: string): Promise<{ ok: boolean; detail: string }> {
  const cfg = cfgs[slug];
  if (!cfg?.url) return { ok: false, detail: `${slug}: fornecedor não cadastrado` };
  if (!cfg.key) return { ok: false, detail: `${slug}: API key ausente` };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(cfg.url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key: cfg.key, action: "refill", order: String(orderId) }).toString(),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }
    const text = await res.text();
    let json: RefillResp | null = null;
    try { json = JSON.parse(text) as RefillResp; } catch { /* resposta não-JSON */ }
    if (json?.refill != null && json.refill !== "") {
      return { ok: true, detail: `reposição aceita (#${json.refill})` };
    }
    return { ok: false, detail: (json?.error ?? text).toString().slice(0, 160) };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export type DropWatcherSummary = {
  analisados: number;
  reposicoes_pedidas: number;
  sem_garantia: number;
  detalhes: Array<{ pedido: string; fornecedor: string; ok: boolean; detalhe: string }>;
};

export async function runDropWatcher(): Promise<DropWatcherSummary> {
  const now = new Date();
  const de = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ate = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

  const { data: pedidos } = await supabaseAdmin
    .from("pedidos")
    .select("id, pacote, provider_slug, provider_order_id, created_at")
    .in("status", ["completed", "Enviado"])
    .not("provider_order_id", "is", null)
    .is("refill_requested_at", null)
    .gte("created_at", de)
    .lte("created_at", ate)
    .limit(40);

  const summary: DropWatcherSummary = { analisados: 0, reposicoes_pedidas: 0, sem_garantia: 0, detalhes: [] };
  const cfgs = await loadProviderConfigs();

  for (const p of ((pedidos as any[]) ?? [])) {
    summary.analisados++;
    const slug = String(p.provider_slug ?? "");
    const r = await requestRefill(cfgs, slug, String(p.provider_order_id));
    if (r.ok) summary.reposicoes_pedidas++; else summary.sem_garantia++;
    summary.detalhes.push({ pedido: String(p.id), fornecedor: slug, ok: r.ok, detalhe: r.detail });

    await supabaseAdmin
      .from("pedidos")
      .update({
        refill_requested_at: new Date().toISOString(),
        refill_result: `${r.ok ? "OK" : "RECUSADO"}: ${r.detail}`,
        drop_checked_at: new Date().toISOString(),
      } as never)
      .eq("id", p.id);
  }

  await supabaseAdmin.from("admin_audit_logs").insert({
    action: "drop_watcher_v254",
    detail: summary as never,
  } as never);

  return summary;
}
