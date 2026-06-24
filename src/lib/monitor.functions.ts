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

    const { data: logs } = await supabaseAdmin
      .from("monitoramento_saldo")
      .select("saldo, status, data_hora, tempo_resposta_ms, erro_retornado")
      .eq("fornecedor_id", fornecedor.id)
      .order("data_hora", { ascending: false })
      .limit(10);

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
      logs: logs ?? [],
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
