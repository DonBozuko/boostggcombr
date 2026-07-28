// v323 — BANCADA AUTÔNOMA.
//
// Por que existe: a Bancada de Provas (v322) só rodava quando um humano
// clicava no botão. Entre um clique e outro o fornecedor troca ID, sobe custo
// ou o saldo acaba — e quem descobre é o cliente pagando e sendo estornado.
//
// Este serviço roda sozinho (cron), pacote por pacote, a MESMA decisão do
// checkout (rankProvidersByCost + evaluateRoute), grava o resultado no banco
// (bench_runs / bench_findings), CORRIGE o que dá pra corrigir sozinho
// (tira da vitrine o que não tem rota e religa o que voltou) e só chama o dono
// quando precisa de dinheiro/mão humana.
//
// Regras herdadas (não quebrar):
// - v297: bloqueio ESTRUTURAL (sem ID válido) derruba a prateleira;
//   bloqueio por SALDO/MARGEM é transitório e NÃO derruba (só alerta).
// - v319: silêncio inteligente — mesma lista de problemas não reavisa em 12h.
// - Religa apenas o que ESTA trava pausou (prefixo próprio).

import { classifyBench, summarizeBench, type BenchRow } from "@/lib/bench-sweep";

const PAUSE_PREFIX = "BANCADA";
const ALERTA_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const CONCURRENCY = 4;

export type BenchRunResult = {
  ok: boolean;
  run_id: string | null;
  total: number;
  entregavel: number;
  travados: number;
  pausados: string[];
  religados: string[];
  recarga_por_fornecedor: Record<string, number>;
  alertou: boolean;
  erro?: string;
};

function brl(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

async function assinatura(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function podeAlertar(sig: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = `bench-autonomo:${sig}`;
    const { data } = await (supabaseAdmin as any)
      .from("canary_alert_state")
      .select("last_sent_at")
      .eq("alert_key", key)
      .maybeSingle();
    const ultimo = data?.last_sent_at ? Date.parse(data.last_sent_at) : 0;
    if (ultimo && Date.now() - ultimo < ALERTA_COOLDOWN_MS) return false;
    await (supabaseAdmin as any)
      .from("canary_alert_state")
      .upsert({ alert_key: key, last_sent_at: new Date().toISOString() }, { onConflict: "alert_key" });
    return true;
  } catch {
    return true; // falha de estado nunca cala alerta de dinheiro
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export async function runBenchAutonomo(
  options: { notify?: boolean; origem?: string } = {},
): Promise<BenchRunResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
  const { evaluateRoute } = await import("@/lib/route-preflight");

  const { data: run } = await (supabaseAdmin as any)
    .from("bench_runs")
    .insert({ origem: options.origem ?? "cron" })
    .select("id")
    .maybeSingle();
  const runId: string | null = run?.id ?? null;

  try {
    // Catálogo inteiro, paginado (v308: nunca confiar no limite padrão).
    const items: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabaseAdmin
        .from("pricing_items" as any)
        .select("pacote, category, quantidade, price_brl, is_sellable, sellable_reason")
        .order("category")
        .order("quantidade")
        .range(from, from + 999);
      const page = ((data as any[]) ?? []);
      items.push(...page);
      if (page.length < 1000) break;
    }

    const rows: BenchRow[] = await mapLimit(items, CONCURRENCY, async (it) => {
      const price = Number(it.price_brl ?? 0);
      const quantidade = Number(it.quantidade ?? 0);
      try {
        const ranked = (await rankProvidersByCost({
          pacote: String(it.pacote),
          quantidade,
        })) as any[];
        const res = evaluateRoute(ranked as any, price);
        return {
          pacote: String(it.pacote),
          category: it.category ?? null,
          quantidade,
          price_brl: price,
          ...classifyBench(ranked as any, res),
        };
      } catch (e) {
        // Falha NOSSA não vira veredito contra o pacote: fica marcada como
        // "não avaliado" e nunca derruba prateleira nem gera alerta de saldo.
        return {
          pacote: String(it.pacote),
          category: it.category ?? null,
          quantidade,
          price_brl: price,
          verdict: "nao_avaliado" as any,
          motivo: `Não consegui avaliar agora (${(e as Error).message.slice(0, 80)})`,
          fornecedor: null,
          custoBrl: null,
          faltaRecarregar: null,
          faltaEm: null,
        };
      }
    });

    const avaliados = rows.filter((r) => (r.verdict as string) !== "nao_avaliado");
    const s = summarizeBench(avaliados);

    // ---- Correção automática -------------------------------------------
    // Só o que é ESTRUTURAL sai da vitrine (v297). Saldo/margem é transitório.
    const estruturais = new Map<string, string>();
    for (const r of avaliados) {
      if (r.verdict === "catalogo" || r.verdict === "sem_fornecedor") {
        estruturais.set(r.pacote, `${PAUSE_PREFIX}: ${r.motivo}`);
      }
    }

    const pausados: string[] = [];
    for (const [pacote, motivo] of estruturais) {
      const { data } = await supabaseAdmin
        .from("pricing_items" as any)
        .update({ is_sellable: false, sellable_reason: motivo.slice(0, 400) })
        .eq("pacote", pacote)
        .neq("is_sellable", false)
        .select("pacote");
      if ((data as any[])?.length) pausados.push(pacote);
    }

    // Religa SÓ o que esta trava pausou e que agora tem rota provada agora.
    const entregaveis = new Set(avaliados.filter((r) => r.verdict === "entregavel").map((r) => r.pacote));
    const religados: string[] = [];
    const { data: pausadosDb } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, sellable_reason")
      .eq("is_sellable", false)
      .like("sellable_reason", `${PAUSE_PREFIX}%`);
    for (const p of ((pausadosDb as any[]) ?? [])) {
      const pacote = String(p.pacote);
      if (!entregaveis.has(pacote)) continue;
      const { data } = await supabaseAdmin
        .from("pricing_items" as any)
        .update({ is_sellable: true, sellable_reason: null })
        .eq("pacote", pacote)
        .eq("is_sellable", false)
        .select("pacote");
      if ((data as any[])?.length) religados.push(pacote);
    }

    // ---- Persistência ---------------------------------------------------
    if (runId) {
      const travadosRows = rows.filter((r) => r.verdict !== "entregavel");
      if (travadosRows.length > 0) {
        await (supabaseAdmin as any).from("bench_findings").insert(
          travadosRows.map((r) => ({
            run_id: runId,
            pacote: r.pacote,
            category: r.category,
            quantidade: r.quantidade,
            price_brl: r.price_brl,
            verdict: r.verdict,
            motivo: r.motivo,
            fornecedor: r.fornecedor,
            custo_brl: r.custoBrl,
            falta_recarregar: r.faltaRecarregar,
            falta_em: r.faltaEm,
          })),
        );
      }
      await (supabaseAdmin as any)
        .from("bench_runs")
        .update({
          finished_at: new Date().toISOString(),
          total: rows.length,
          entregavel: s.entregavel,
          por_veredito: s.porVeredito,
          recarga_por_fornecedor: s.recargaPorFornecedor,
          rotas_com_problema: s.rotasComProblema,
          pausados,
          religados,
        })
        .eq("id", runId);
    }

    // ---- Aviso humano (só quando precisa de mão/dinheiro) ----------------
    let alertou = false;
    const precisaRecarga = Object.entries(s.recargaPorFornecedor);
    const margem = avaliados.filter((r) => r.verdict === "margem").length;
    const naoAvaliados = rows.length - avaliados.length;

    if (options.notify !== false && (precisaRecarga.length > 0 || estruturais.size > 0 || margem > 0)) {
      const linhas: string[] = [];
      linhas.push("🧪 VARREDURA AUTOMÁTICA DE ENTREGA");
      linhas.push("");
      linhas.push(
        `PROBLEMA: ${rows.length - s.entregavel} de ${rows.length} pacotes não teriam entrega garantida agora.`,
      );
      if (precisaRecarga.length > 0) {
        linhas.push("");
        linhas.push("Falta saldo:");
        for (const [forn, falta] of precisaRecarga) {
          linhas.push(`• ${forn}: recarregar ${brl(falta)}`);
        }
      }
      if (estruturais.size > 0) {
        linhas.push("");
        linhas.push(`Sem fornecedor válido: ${estruturais.size} pacote(s) — já tirei da vitrine sozinho.`);
      }
      if (margem > 0) {
        linhas.push("");
        linhas.push(`Custo alto demais: ${margem} pacote(s) venderiam no prejuízo.`);
      }
      if (religados.length > 0) {
        linhas.push("");
        linhas.push(`Voltaram à vitrine sozinhos: ${religados.length} pacote(s).`);
      }
      if (naoAvaliados > 0) {
        linhas.push("");
        linhas.push(`Não consegui testar agora: ${naoAvaliados} pacote(s) (nada foi pausado por isso).`);
      }
      linhas.push("");
      linhas.push(
        precisaRecarga.length > 0
          ? "O QUE FAZER: recarregar os valores acima no fornecedor. O resto o sistema resolve sozinho na próxima varredura."
          : "O QUE FAZER: nada agora — já corrigi o que dava. Confira no painel (aba Auditoria) se quiser ver pacote por pacote.",
      );

      const texto = linhas.join("\n");
      const sig = await assinatura(
        JSON.stringify({
          recarga: s.recargaPorFornecedor,
          estruturais: [...estruturais.keys()].sort(),
          margem,
        }),
      );
      if (await podeAlertar(sig)) {
        const { dispatchTelegramAlert } = await import("@/lib/messaging");
        const r = await dispatchTelegramAlert(texto, {
          severity: precisaRecarga.length > 0 || estruturais.size > 0 ? "critical" : "warning",
          origem: "bench-autonomo",
        });
        alertou = r.ok;
      }
    }

    if (runId) {
      await (supabaseAdmin as any).from("bench_runs").update({ alertou }).eq("id", runId);
    }

    // ---- v334: o alarme está ANDANDO? -----------------------------------
    // Achado idêntico nas últimas N varreduras = trava nossa que não converge.
    // Sobe com texto e cooldown próprios: a ação é consertar código, não
    // recarregar saldo.
    if (options.notify !== false) {
      try {
        const { achadosNaoConvergentes, mensagemNaoConvergencia, CICLOS_PARA_DEFEITO } =
          await import("@/lib/convergence");

        const { data: ultimasRuns } = await (supabaseAdmin as any)
          .from("bench_runs")
          .select("id")
          .not("finished_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(CICLOS_PARA_DEFEITO);

        const ids: string[] = (ultimasRuns ?? []).map((r: any) => r.id);
        if (ids.length === CICLOS_PARA_DEFEITO) {
          const { data: achados } = await (supabaseAdmin as any)
            .from("bench_findings")
            .select("run_id, pacote, verdict")
            .in("run_id", ids);

          const porRun = new Map<string, string[]>(ids.map((id) => [id, []]));
          for (const a of achados ?? []) {
            porRun.get(a.run_id)?.push(`${a.pacote}|${a.verdict}`);
          }
          const ciclos = ids.map((id) => ({ runId: id, assinaturas: porRun.get(id) ?? [] }));
          const travados = achadosNaoConvergentes(ciclos);
          const msg = mensagemNaoConvergencia(travados);

          if (msg) {
            const sigLoop = await assinatura(
              JSON.stringify({ loop: travados.map((t) => t.assinatura) }),
            );
            if (await podeAlertar(sigLoop)) {
              const { dispatchTelegramAlert } = await import("@/lib/messaging");
              await dispatchTelegramAlert(msg, {
                severity: "critical",
                origem: "bench-nao-convergencia",
              });
            }
          }
        }
      } catch {
        // Falha nossa aqui nunca pode derrubar a varredura.
      }
    }


    return {
      ok: true,
      run_id: runId,
      total: rows.length,
      entregavel: s.entregavel,
      travados: rows.length - s.entregavel,
      pausados,
      religados,
      recarga_por_fornecedor: s.recargaPorFornecedor,
      alertou,
    };
  } catch (e: any) {
    const erro = e?.message ?? String(e);
    if (runId) {
      await (supabaseAdmin as any)
        .from("bench_runs")
        .update({ finished_at: new Date().toISOString(), erro: erro.slice(0, 400) })
        .eq("id", runId);
    }
    return {
      ok: false,
      run_id: runId,
      total: 0,
      entregavel: 0,
      travados: 0,
      pausados: [],
      religados: [],
      recarga_por_fornecedor: {},
      alertou: false,
      erro,
    };
  }
}
