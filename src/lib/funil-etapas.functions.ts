// v363 — LEITURA DO FUNIL POR ETAPA (onde o cliente desiste).
// Só leitura. Conta sessões distintas por etapa, não cliques.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type EtapaFunil = {
  etapa: string;
  rotulo: string;
  sessoes: number;
  eventos: number;
};

export type QuedaPacote = { plan_id: string; escolhas: number; pix: number };

export type FunilEtapasPayload = {
  ok: boolean;
  error?: string;
  etapas: EtapaFunil[];
  falhas_pix: { motivo: string; n: number }[];
  quedas_por_pacote: QuedaPacote[];
  dias: number;
};

const ORDEM: { key: string; rotulo: string }[] = [
  { key: "escolheu_pacote", rotulo: "Clicou em um pacote" },
  { key: "preencheu_perfil", rotulo: "Digitou o @" },
  { key: "enviou_formulario", rotulo: "Clicou em pagar" },
  { key: "pix_gerado", rotulo: "Pix apareceu na tela" },
  { key: "pix_copiado", rotulo: "Copiou o código Pix" },
  { key: "pagou", rotulo: "Pagou" },
];

export const getFunilEtapas = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ token: z.string().min(8), days: z.number().int().min(1).max(90).default(7) }).parse(i),
  )
  .handler(async ({ data }): Promise<FunilEtapasPayload> => {
    const vazio: FunilEtapasPayload = {
      ok: false,
      etapas: [],
      falhas_pix: [],
      quedas_por_pacote: [],
      dias: data.days,
    };
    const expected = process.env.ADMIN_TOKEN;
    if (!expected || data.token !== expected) return { ...vazio, error: "UNAUTHORIZED" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const desde = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("funnel_events" as never)
      .select("step, session_id, plan_id, detail")
      .gte("created_at", desde)
      .limit(50_000);

    if (error) return { ...vazio, error: error.message };

    const list = (rows as unknown as {
      step: string;
      session_id: string | null;
      plan_id: string | null;
      detail: string | null;
    }[]) ?? [];

    const etapas: EtapaFunil[] = ORDEM.map(({ key, rotulo }) => {
      const doStep = list.filter((r) => r.step === key);
      const sessoes = new Set(doStep.map((r) => r.session_id ?? "?")).size;
      return { etapa: key, rotulo, sessoes, eventos: doStep.length };
    });

    const motivos = new Map<string, number>();
    for (const r of list) {
      if (r.step !== "pix_falhou") continue;
      const m = (r.detail ?? "desconhecido").slice(0, 80);
      motivos.set(m, (motivos.get(m) ?? 0) + 1);
    }

    const porPacote = new Map<string, QuedaPacote>();
    for (const r of list) {
      if (!r.plan_id) continue;
      let p = porPacote.get(r.plan_id);
      if (!p) { p = { plan_id: r.plan_id, escolhas: 0, pix: 0 }; porPacote.set(r.plan_id, p); }
      if (r.step === "escolheu_pacote") p.escolhas += 1;
      if (r.step === "pix_gerado") p.pix += 1;
    }

    return {
      ok: true,
      etapas,
      falhas_pix: [...motivos.entries()]
        .map(([motivo, n]) => ({ motivo, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 10),
      quedas_por_pacote: [...porPacote.values()]
        .filter((p) => p.escolhas > 0)
        .sort((a, b) => b.escolhas - a.escolhas)
        .slice(0, 15),
      dias: data.days,
    };
  });
