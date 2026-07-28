// v323 — Leitura da Bancada Autônoma para o painel.
// O painel não recalcula nada: mostra o último veredito que o sistema já gravou.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenInput = z.object({ token: z.string().min(8) });

function authorized(token: string): boolean {
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export const getLastBenchRun = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenInput.parse(i))
  .handler(async ({ data }) => {
    if (!authorized(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: run } = await (supabaseAdmin as any)
      .from("bench_runs")
      .select("*")
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!run) return { ok: true as const, run: null, findings: [] as any[] };

    const { data: findings } = await (supabaseAdmin as any)
      .from("bench_findings")
      .select("pacote, category, quantidade, price_brl, verdict, motivo, fornecedor, custo_brl, falta_recarregar, falta_em")
      .eq("run_id", run.id)
      .order("verdict")
      .limit(500);

    return { ok: true as const, run, findings: ((findings as any[]) ?? []) };
  });

export const runBenchNow = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenInput.parse(i))
  .handler(async ({ data }) => {
    if (!authorized(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { runBenchAutonomo } = await import("@/services/bench-autonomo.server");
    return await runBenchAutonomo({ notify: true, origem: "manual" });
  });
