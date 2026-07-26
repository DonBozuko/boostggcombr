import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// v261 — Gestão de revendedores (painel admin). Protegido por ADMIN_TOKEN,
// mesmo padrão dos outros painéis (wallets, treasury).

const tokenOnly = z.object({ token: z.string().min(8) });

function auth(token: string): boolean {
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export type Reseller = {
  id: string;
  nome: string;
  email: string;
  api_key_prefix: string;
  desconto_pct: number;
  saldo_brl: number;
  ativo: boolean;
  created_at: string;
  pedidos: number;
  faturado: number;
};

export const listResellers = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; resellers: Reseller[] }> => {
    if (!auth(data.token)) return { ok: false, error: "UNAUTHORIZED", resellers: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: rs }, { data: peds }] = await Promise.all([
      supabaseAdmin.from("resellers" as any).select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("pedidos").select("reseller_id, reseller_valor").not("reseller_id", "is", null),
    ]);
    const agg = new Map<string, { n: number; total: number }>();
    for (const p of (peds ?? []) as any[]) {
      const k = String(p.reseller_id);
      const cur = agg.get(k) ?? { n: 0, total: 0 };
      cur.n += 1;
      cur.total += Number(p.reseller_valor ?? 0);
      agg.set(k, cur);
    }
    return {
      ok: true,
      resellers: ((rs ?? []) as any[]).map((r) => ({
        id: String(r.id),
        nome: String(r.nome),
        email: String(r.email),
        api_key_prefix: String(r.api_key_prefix ?? ""),
        desconto_pct: Number(r.desconto_pct ?? 0),
        saldo_brl: Number(r.saldo_brl ?? 0),
        ativo: r.ativo === true,
        created_at: String(r.created_at),
        pedidos: agg.get(String(r.id))?.n ?? 0,
        faturado: Number((agg.get(String(r.id))?.total ?? 0).toFixed(2)),
      })),
    };
  });

export const createReseller = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        token: z.string().min(8),
        nome: z.string().min(2).max(80),
        email: z.string().email(),
        desconto_pct: z.number().min(0).max(0.3),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; apiKey?: string }> => {
    if (!auth(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { generateApiKey, hashApiKey } = await import("@/lib/reseller-api.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { key, prefix } = generateApiKey();
    const { error } = await supabaseAdmin.from("resellers" as any).insert({
      nome: data.nome,
      email: data.email.toLowerCase(),
      desconto_pct: data.desconto_pct,
      api_key_hash: await hashApiKey(key),
      api_key_prefix: prefix,
      ativo: true,
    } as any);
    if (error) return { ok: false, error: error.message };
    // A chave em texto puro aparece UMA única vez, aqui. Não fica no banco.
    return { ok: true, apiKey: key };
  });

export const updateReseller = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        token: z.string().min(8),
        id: z.string().uuid(),
        ativo: z.boolean().optional(),
        desconto_pct: z.number().min(0).max(0.3).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!auth(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.ativo !== undefined) patch.ativo = data.ativo;
    if (data.desconto_pct !== undefined) patch.desconto_pct = data.desconto_pct;
    if (!Object.keys(patch).length) return { ok: false, error: "nada a alterar" };
    const { error } = await supabaseAdmin.from("resellers" as any).update(patch as any).eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const creditReseller = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        token: z.string().min(8),
        id: z.string().uuid(),
        valor: z.number().refine((v) => Math.abs(v) >= 1 && Math.abs(v) <= 50000, "valor fora da faixa"),
        detalhe: z.string().max(200).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; saldo?: number }> => {
    if (!auth(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: mv, error } = await supabaseAdmin.rpc("reseller_balance_move" as any, {
      _reseller_id: data.id,
      _amount: data.valor,
      _tipo: data.valor >= 0 ? "deposit" : "adjust",
      _pedido_id: null,
      _detalhe: data.detalhe ?? "lançamento manual admin",
    });
    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(mv) ? (mv as any[])[0] : (mv as any);
    if (!row?.ok) return { ok: false, error: row?.motivo ?? "falhou" };
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_email: "admin@painel",
      action: "reseller_balance_move",
      detail: { reseller_id: data.id, valor: data.valor, saldo: row.saldo },
    } as any);
    return { ok: true, saldo: Number(row.saldo) };
  });

export const resellerLedger = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string().min(8), id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    if (!auth(data.token)) return { ok: false as const, error: "UNAUTHORIZED", rows: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("reseller_ledger" as any)
      .select("created_at, tipo, valor_brl, saldo_depois, detalhe, pedido_id")
      .eq("reseller_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      ok: true as const,
      rows: ((rows ?? []) as any[]).map((r) => ({
        created_at: String(r.created_at),
        tipo: String(r.tipo),
        valor: Number(r.valor_brl),
        saldo_depois: Number(r.saldo_depois),
        detalhe: String(r.detalhe ?? ""),
        pedido_id: r.pedido_id ? String(r.pedido_id) : null,
      })),
    };
  });
