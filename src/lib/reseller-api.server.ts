// v261 — API de Revenda (padrão compatível com painéis SMM).
//
// Regras não-negociáveis:
//  - preço de varejo do site NÃO muda; desconto sai da margem existente
//  - piso de lucro por pedido garantido por src/lib/reseller-pricing.ts
//  - saldo pré-pago: débito atômico no banco antes de despachar
//  - falha no despacho → pedido fica na fila existente (waiting_provision)
//    e os robôs/alertas atuais cuidam; nada de caminho paralelo novo.

import { quoteReseller, resellerRespectsMinMargin } from "@/lib/reseller-pricing";

export type ResellerRow = {
  id: string;
  nome: string;
  email: string;
  desconto_pct: number;
  saldo_brl: number;
  ativo: boolean;
};

async function sha256Hex(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashApiKey(raw: string): Promise<string> {
  return sha256Hex(`bgg-reseller:${raw.trim()}`);
}

export function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 40);
  const key = `bgg_${body}`;
  return { key, prefix: key.slice(0, 10) };
}

export async function authReseller(rawKey: string): Promise<ResellerRow | null> {
  if (!rawKey || rawKey.trim().length < 8) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await hashApiKey(rawKey);
  const { data } = await supabaseAdmin
    .from("resellers" as any)
    .select("id, nome, email, desconto_pct, saldo_brl, ativo")
    .eq("api_key_hash", hash)
    .maybeSingle();
  const r = data as any;
  if (!r || r.ativo !== true) return null;
  return {
    id: String(r.id),
    nome: String(r.nome),
    email: String(r.email),
    desconto_pct: Number(r.desconto_pct ?? 0),
    saldo_brl: Number(r.saldo_brl ?? 0),
    ativo: true,
  };
}

type Params = Record<string, string>;

export async function parseParams(request: Request): Promise<Params> {
  const ct = request.headers.get("content-type") ?? "";
  const out: Params = {};
  const url = new URL(request.url);
  url.searchParams.forEach((v, k) => (out[k] = v));
  try {
    if (ct.includes("application/json")) {
      const j = await request.json();
      for (const [k, v] of Object.entries(j ?? {})) out[k] = String(v ?? "");
    } else if (request.method !== "GET") {
      const fd = await request.formData();
      fd.forEach((v, k) => (out[k] = String(v)));
    }
  } catch { /* corpo vazio/inválido: usa querystring */ }
  return out;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });

/** Catálogo visível ao revendedor, já com preço dele. */
async function actionServices(reseller: ResellerRow) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, price_brl, cost_brl, is_sellable, refill_supported")
    .order("category")
    .order("quantidade");
  const rows = ((data ?? []) as any[]).filter(
    (r) => r.is_sellable !== false && Number(r.price_brl) > 0 && Number(r.quantidade) > 0,
  );
  const services = rows.map((r) => {
    const q = quoteReseller({
      catalogPrice: Number(r.price_brl),
      costBrl: Number(r.cost_brl),
      descontoPct: reseller.desconto_pct,
    });
    const qty = Number(r.quantidade);
    return {
      service: String(r.pacote),
      name: `${qty.toLocaleString("pt-BR")} ${String(r.category ?? "").replace(/:/g, " ")}`,
      category: String(r.category ?? ""),
      quantity: qty,
      // rate = preço por 1000 (padrão de mercado) + preço fechado do pacote
      rate: Number(((q.price / qty) * 1000).toFixed(4)),
      package_price: q.price,
      retail_price: q.retail,
      min: qty,
      max: qty,
      refill: r.refill_supported === true,
      type: "Package",
      currency: "BRL",
    };
  });
  return json({ ok: true, services });
}

async function actionBalance(reseller: ResellerRow) {
  return json({ ok: true, balance: reseller.saldo_brl.toFixed(2), currency: "BRL" });
}

async function actionStatus(reseller: ResellerRow, p: Params) {
  const id = (p.order ?? p.id ?? "").trim();
  if (!/^[0-9a-f-]{16,40}$/i.test(id)) return json({ error: "Invalid order id" }, 400);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, pacote, quantidade, reseller_valor, last_remains, created_at")
    .eq("id", id)
    .eq("reseller_id", reseller.id)
    .maybeSingle();
  if (!data) return json({ error: "Order not found" }, 404);
  const row = data as any;
  const map: Record<string, string> = {
    Enviado: "Completed",
    completed: "Completed",
    processing: "In progress",
    waiting_provision: "Pending",
    MARGIN_HOLD: "Pending",
    SMM_FAILED: "Pending",
    cancelled: "Canceled",
    mp_refunded: "Refunded",
    refunded: "Refunded",
  };
  return json({
    ok: true,
    order: String(row.id),
    status: map[String(row.status)] ?? "Pending",
    charge: Number(row.reseller_valor ?? 0).toFixed(2),
    currency: "BRL",
    quantity: Number(row.quantidade),
    remains: row.last_remains != null ? Number(row.last_remains) : null,
    created_at: row.created_at,
  });
}

async function actionAdd(reseller: ResellerRow, p: Params) {
  const pacote = (p.service ?? "").trim().toLowerCase();
  const link = (p.link ?? p.username ?? "").trim();
  if (!pacote || pacote.length > 30) return json({ error: "Invalid service" }, 400);
  if (link.length < 2 || link.length > 200) return json({ error: "Invalid link" }, 400);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Kill switch global: se a operação está parada, revenda também para.
  const { isGloballyBlocked } = await import("@/lib/kill-switch.server");
  if (await isGloballyBlocked()) return json({ error: "Service temporarily unavailable" }, 503);

  const { data: itemRow } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, quantidade, price_brl, cost_brl, is_sellable, sellable_reason, category")
    .eq("pacote", pacote)
    .maybeSingle();
  const item = itemRow as any;
  if (!item) return json({ error: "Service not found" }, 404);
  if (item.is_sellable === false) return json({ error: `Service unavailable: ${item.sellable_reason ?? "paused"}` }, 409);

  const cost = Number(item.cost_brl);
  const q = quoteReseller({ catalogPrice: Number(item.price_brl), costBrl: cost, descontoPct: reseller.desconto_pct });
  if (!(q.price > 0)) return json({ error: "Service unavailable: price" }, 409);
  if (!resellerRespectsMinMargin(q.price, cost)) {
    return json({ error: "Service unavailable: margin" }, 409);
  }
  if (reseller.saldo_brl + 1e-9 < q.price) {
    return json({ error: "Not enough funds", balance: reseller.saldo_brl.toFixed(2), price: q.price.toFixed(2) }, 402);
  }

  const rede = redeFromCategory(String(item.category ?? ""), pacote);

  // v279 — Idempotência real da API de revenda.
  //
  // Causa raiz: a rota aceitava qualquer POST. Um timeout de rede no lado do
  // revendedor faz o cliente repetir a chamada — e o sistema criava um SEGUNDO
  // pedido, debitava o saldo de novo e entregava duas vezes. O padrão de mercado
  // é chave de idempotência; aqui ela é derivada de (revendedor, pacote, link,
  // janela de 90s) OU do header/param enviado pelo cliente, e a unicidade é
  // garantida pelo índice único no banco (não por leitura antes da escrita, que
  // não protege contra requisições realmente simultâneas).
  const clientKey = (p.idempotency_key ?? "").trim().slice(0, 80);
  const bucket = Math.floor(Date.now() / 90_000);
  const idemKey = clientKey
    ? `rs:${reseller.id}:${clientKey}`
    : `rs:${reseller.id}:${pacote}:${link.toLowerCase()}:${bucket}`;

  // 1) Pedido primeiro (rastreável mesmo se algo falhar depois).
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("pedidos")
    .insert({
      instagram_user: link,
      pacote,
      quantidade: Number(item.quantidade),
      valor: q.price,
      reseller_valor: q.price,
      reseller_id: reseller.id,
      reseller_idem_key: idemKey,
      status: "waiting_provision",
      rede_social: rede,
      email_contato: reseller.email,
      utm_source: "revenda",
      utm_medium: "api",
      error_detail: `v261 revenda · ${reseller.nome} (desc ${(q.discount * 100).toFixed(1)}%)`,
    } as any)
    .select("id")
    .single();
  if (insErr || !inserted) {
    console.error("[reseller-api] insert falhou", insErr);
    return json({ error: "Internal error" }, 500);
  }
  const pedidoId = String((inserted as any).id);

  // 2) Débito atômico do saldo. Se falhar, cancela o pedido — nunca entrega grátis.
  const { data: mv } = await supabaseAdmin.rpc("reseller_balance_move" as any, {
    _reseller_id: reseller.id,
    _amount: -q.price,
    _tipo: "debit",
    _pedido_id: pedidoId,
    _detalhe: `pedido ${pacote}`,
  });
  const move = Array.isArray(mv) ? (mv as any[])[0] : (mv as any);
  if (!move?.ok) {
    await supabaseAdmin
      .from("pedidos")
      .update({ status: "cancelled", error_detail: `v261 revenda · saldo insuficiente (${move?.motivo ?? "erro"})` } as any)
      .eq("id", pedidoId);
    return json({ error: "Not enough funds", balance: reseller.saldo_brl.toFixed(2) }, 402);
  }

  // 3) Despacho pelo pipeline existente (mesmas travas BR/refill/fornecedor),
  //    com o piso de lucro próprio da revenda.
  try {
    const { reprocessWaitingProvision } = await import("@/lib/reprocess-waiting.server");
    const r = await reprocessWaitingProvision(pedidoId, {
      marginCheck: resellerRespectsMinMargin,
      tag: "v261 revenda",
    });
    if (!r.ok) {
      console.warn("[reseller-api] dispatch pendente", pedidoId, r.error);
      // fica em waiting_provision → watchers/reconciliador existentes cuidam
    }
  } catch (e) {
    console.error("[reseller-api] dispatch exceção", e);
  }

  return json({
    ok: true,
    order: pedidoId,
    charge: q.price.toFixed(2),
    currency: "BRL",
    balance: Number(move.saldo).toFixed(2),
  });
}

function redeFromCategory(category: string, pacote: string): string {
  const c = `${category} ${pacote}`.toLowerCase();
  if (c.includes("tiktok") || /^t[flv]/.test(pacote)) return "tiktok";
  if (c.includes("youtube") || /^y/.test(pacote)) return "youtube";
  if (c.includes("facebook") || /^f/.test(pacote)) return "facebook";
  if (c.includes("telegram") || /^tg/.test(pacote)) return "telegram";
  if (c.includes("kwai") || /^k/.test(pacote)) return "kwai";
  if (c.includes("trafego") || /^w/.test(pacote)) return "trafego";
  return "instagram";
}

export async function handleResellerApi(request: Request): Promise<Response> {
  const p = await parseParams(request);
  const key = (p.key ?? request.headers.get("x-api-key") ?? "").trim();
  const action = (p.action ?? "").trim().toLowerCase();

  // Rate limit por chave (fail-open, igual ao resto do sistema).
  try {
    const { checkRateLimit } = await import("@/lib/rate-limit.server");
    const rl = await checkRateLimit("reseller-api", key.slice(0, 12) || "anon", 120, 60);
    if (!rl.allowed) return json({ error: "Rate limited" }, 429);
  } catch { /* fail-open */ }

  const reseller = await authReseller(key);
  if (!reseller) return json({ error: "Invalid API key" }, 401);

  switch (action) {
    case "services": return actionServices(reseller);
    case "balance": return actionBalance(reseller);
    case "add": return actionAdd(reseller, p);
    case "status": return actionStatus(reseller, p);
    default: return json({ error: "Invalid action" }, 400);
  }
}
