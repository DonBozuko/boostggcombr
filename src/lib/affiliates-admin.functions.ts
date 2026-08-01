import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// v265 — Gestão de afiliados no admin. Mesmo padrão dos outros painéis: ADMIN_TOKEN.
const tokenOnly = z.object({ token: z.string().min(8) });


export type AfiliadoRow = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  codigo: string;
  pix_chave: string | null;
  comissao_pct: number;
  saldo_brl: number;
  total_ganho: number;
  pago_brl: number;
  ativo: boolean;
  indicacoes: number;
};

export const listAffiliates = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; afiliados: AfiliadoRow[] }> => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED", afiliados: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: rows }, { data: com }] = await Promise.all([
      supabaseAdmin.from("afiliados" as any).select("*").order("total_ganho", { ascending: false }),
      supabaseAdmin.from("afiliado_comissoes" as any).select("afiliado_id"),
    ]);
    const n = new Map<string, number>();
    for (const c of (com ?? []) as any[]) {
      const k = String(c.afiliado_id);
      n.set(k, (n.get(k) ?? 0) + 1);
    }
    return {
      ok: true,
      afiliados: ((rows ?? []) as any[]).map((a) => ({
        id: String(a.id),
        nome: String(a.nome),
        email: String(a.email),
        whatsapp: a.whatsapp ? String(a.whatsapp) : null,
        codigo: String(a.codigo),
        pix_chave: a.pix_chave ? String(a.pix_chave) : null,
        comissao_pct: Number(a.comissao_pct ?? 0.1),
        saldo_brl: Number(a.saldo_brl ?? 0),
        total_ganho: Number(a.total_ganho ?? 0),
        pago_brl: Number(a.pago_brl ?? 0),
        ativo: a.ativo === true,
        indicacoes: n.get(String(a.id)) ?? 0,
      })),
    };
  });

/** Registra que você pagou o saldo do afiliado por Pix (zera saldo, soma em pago). */
export const payAffiliate = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a } = await supabaseAdmin
      .from("afiliados" as any)
      .select("saldo_brl, pago_brl")
      .eq("id", data.id)
      .maybeSingle();
    if (!a) return { ok: false, error: "Afiliado não encontrado" };
    const saldo = Number((a as any).saldo_brl ?? 0);
    if (saldo <= 0) return { ok: false, error: "Sem saldo a pagar" };
    const { error } = await supabaseAdmin
      .from("afiliados" as any)
      .update({
        saldo_brl: 0,
        pago_brl: Number(((a as any).pago_brl ?? 0)) + saldo,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    await supabaseAdmin
      .from("afiliado_comissoes" as any)
      .update({ status: "paga" } as any)
      .eq("afiliado_id", data.id)
      .eq("status", "liberada");
    return { ok: true };
  });

export const toggleAffiliate = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.extend({ id: z.string().uuid(), ativo: z.boolean() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("afiliados" as any)
      .update({ ativo: data.ativo, updated_at: new Date().toISOString() } as any)
      .eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });
