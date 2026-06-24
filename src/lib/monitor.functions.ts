import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adminInput = z.object({ token: z.string().min(8) });

function checkToken(token: string) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return token === expected;
}

export const getMonitorSaldo = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { USD_TO_BRL, classifyBalance } = await import("@/lib/monitor-saldo.server");

    const { data: fornecedor } = await supabaseAdmin
      .from("fornecedores")
      .select("*")
      .eq("nome", "SMMhype")
      .maybeSingle();
    if (!fornecedor) return { ok: false as const, error: "NOT_FOUND" as const };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: historico } = await supabaseAdmin
      .from("monitoramento_saldo")
      .select("saldo, status, data_hora")
      .eq("fornecedor_id", fornecedor.id)
      .gte("data_hora", since)
      .order("data_hora", { ascending: true });

    const saldoBrl = fornecedor.saldo_atual != null ? fornecedor.saldo_atual * USD_TO_BRL : null;

    return {
      ok: true as const,
      fornecedor: {
        nome: fornecedor.nome,
        status: fornecedor.status,
        saldo_usd: fornecedor.saldo_atual,
        saldo_brl: saldoBrl,
        nivel_alerta: classifyBalance(saldoBrl),
        ultima_verificacao: fornecedor.ultima_verificacao,
        falhas_consecutivas: fornecedor.falhas_consecutivas,
        usd_to_brl: USD_TO_BRL,
      },
      historico: (historico ?? []).map((h) => ({
        t: h.data_hora,
        saldo_usd: h.saldo,
        saldo_brl: h.saldo != null ? h.saldo * USD_TO_BRL : null,
        status: h.status,
      })),
    };
  });

export const verificarSaldoAgora = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { checkSmmhypeBalance } = await import("@/lib/monitor-saldo.server");
    const res = await checkSmmhypeBalance();
    return { ok: true as const, result: res };
  });

export const getCronStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any).rpc("get_cron_status", {
      _jobname: "check-smmhype-saldo",
    });
    if (error) return { ok: false as const, error: error.message };
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { ok: true as const, cron: row ?? null };
  });

export const testarCron = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const url = `${process.env.SUPABASE_URL?.includes("localhost") ? "" : ""}https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app/api/public/check-saldo`;
    const t0 = Date.now();
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": process.env.ADMIN_TOKEN ?? "",
        },
        body: "{}",
      });
      const text = await resp.text();
      return {
        ok: resp.ok,
        status: resp.status,
        elapsed_ms: Date.now() - t0,
        body: text.slice(0, 500),
      };
    } catch (e: any) {
      return { ok: false, status: 0, elapsed_ms: Date.now() - t0, body: e?.message ?? String(e) };
    }
  });

export const getCaixaAssistente = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: supplier }, { data: bank }, { data: alerts }] = await Promise.all([
      supabaseAdmin.from("suppliers").select("*").eq("nome", "SMMhype").maybeSingle(),
      supabaseAdmin.from("bank_accounts").select("*").eq("nome", "Caixa Principal").maybeSingle(),
      supabaseAdmin
        .from("alerts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const saldoFornecedor = Number(supplier?.saldo_atual ?? 0);
    const metaIdeal = Number(supplier?.meta_ideal ?? 1000);
    const faltaDepositar = Math.max(0, metaIdeal - saldoFornecedor);

    const saldoCaixa = Number(bank?.saldo_atual ?? 0);
    const minimoSeguranca = Number(bank?.saldo_minimo_seguranca ?? 2000);
    const caixaOk = saldoCaixa >= minimoSeguranca;

    return {
      ok: true as const,
      supplier: supplier
        ? {
            nome: supplier.nome,
            saldo_atual: saldoFornecedor,
            saldo_minimo: Number(supplier.saldo_minimo ?? 0),
            meta_ideal: metaIdeal,
            falta_depositar: faltaDepositar,
            ultimo_update: supplier.ultimo_update,
          }
        : null,
      bank: bank
        ? {
            nome: bank.nome,
            saldo_atual: saldoCaixa,
            saldo_minimo_seguranca: minimoSeguranca,
            ok: caixaOk,
            status_text: caixaOk
              ? "Status do Caixa: OK para recarregar"
              : `🚨 Atenção: Saldo de segurança do caixa bancário está abaixo do mínimo (R$ ${minimoSeguranca.toFixed(2)})`,
          }
        : null,
      alerts: (alerts ?? []).map((a: any) => ({
        id: a.id,
        tipo: a.tipo,
        nivel: a.nivel,
        mensagem: a.mensagem,
        created_at: a.created_at,
      })),
    };
  });

