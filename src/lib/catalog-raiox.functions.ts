// v362 — RAIO-X AO VIVO: o que o fornecedor mudou nas últimas 48h.
// Só leitura do banco (catalog_changes + service_fingerprints). Nada de HTTP.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ token: z.string().min(8) });

export type MudancaLinha = {
  pacote: string;
  campo: string;
  antes: string;
  depois: string;
  quando: string;
  tipo: "id" | "preco" | "custo" | "outro";
};

export type RaioXPayload = {
  ok: boolean;
  error?: string;
  total: number;
  por_tipo: { id: number; preco: number; custo: number; outro: number };
  linhas: MudancaLinha[];
  trocas_de_produto: { pacote: string; provider: string; quando: string; nome: string }[];
  generated_at: string;
};

function classifica(campo: string): MudancaLinha["tipo"] {
  const c = campo.toLowerCase();
  if (c.includes("service_id")) return "id";
  if (c.includes("price")) return "preco";
  if (c.includes("cost") || c.includes("rate")) return "custo";
  return "outro";
}

export const getCatalogRaioX = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }): Promise<RaioXPayload> => {
    const expected = process.env.ADMIN_TOKEN;
    const vazio: RaioXPayload = {
      ok: false,
      total: 0,
      por_tipo: { id: 0, preco: 0, custo: 0, outro: 0 },
      linhas: [],
      trocas_de_produto: [],
      generated_at: new Date().toISOString(),
    };
    if (!expected || data.token !== expected) return { ...vazio, error: "UNAUTHORIZED" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const desde = new Date(Date.now() - 48 * 3600_000).toISOString();

    const [{ data: ch }, { data: fp }] = await Promise.all([
      supabaseAdmin
        .from("catalog_changes" as any)
        .select("pacote, campo, valor_antes, valor_depois, changed_at")
        .gte("changed_at", desde)
        .order("changed_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("service_fingerprints" as any)
        .select("pacote, provider, last_drift_at, last_drift_name")
        .gte("last_drift_at", desde)
        .order("last_drift_at", { ascending: false })
        .limit(50),
    ]);

    const linhas: MudancaLinha[] = ((ch as any[]) ?? []).map((r) => ({
      pacote: String(r.pacote ?? ""),
      campo: String(r.campo ?? ""),
      antes: String(r.valor_antes ?? "—"),
      depois: String(r.valor_depois ?? "—"),
      quando: String(r.changed_at ?? ""),
      tipo: classifica(String(r.campo ?? "")),
    }));

    const por_tipo = { id: 0, preco: 0, custo: 0, outro: 0 };
    for (const l of linhas) por_tipo[l.tipo] += 1;

    return {
      ok: true,
      total: linhas.length,
      por_tipo,
      linhas: linhas.slice(0, 120),
      trocas_de_produto: ((fp as any[]) ?? []).map((r) => ({
        pacote: String(r.pacote ?? ""),
        provider: String(r.provider ?? ""),
        quando: String(r.last_drift_at ?? ""),
        nome: String(r.last_drift_name ?? "—"),
      })),
      generated_at: new Date().toISOString(),
    };
  });
