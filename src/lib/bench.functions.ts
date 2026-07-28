// v322 — BANCADA DE PROVAS (execução).
//
// Roda a MESMA decisão do checkout (rankProvidersByCost + evaluateRoute) em
// TODOS os pacotes, contra catálogo e saldo vivos, sem cobrar ninguém e sem
// despachar nada. Só leitura.
//
// Batelado de propósito: são ~280 pacotes e cada um consulta fornecedor.
// O painel chama em fatias para nunca estourar tempo de resposta.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classifyBench, type BenchRow } from "@/lib/bench-sweep";

const input = z.object({
  token: z.string().min(8),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(40).default(20),
});

function authorized(token: string): boolean {
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export const benchCount = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string().min(8) }).parse(i))
  .handler(async ({ data }) => {
    if (!authorized(data.token)) return { ok: false as const, error: "UNAUTHORIZED", total: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote", { count: "exact", head: true });
    return { ok: true as const, total: count ?? 0 };
  });

export const benchBatch = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    if (!authorized(data.token)) return { ok: false as const, error: "UNAUTHORIZED", rows: [] as BenchRow[] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
    const { evaluateRoute } = await import("@/lib/route-preflight");

    const { data: items } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, category, quantidade, price_brl")
      .order("category")
      .order("quantidade")
      .range(data.offset, data.offset + data.limit - 1);

    const list = ((items as any[]) ?? []);

    const rows: BenchRow[] = [];
    for (const it of list) {
      const price = Number(it.price_brl ?? 0);
      const quantidade = Number(it.quantidade ?? 0);
      try {
        const ranked = (await rankProvidersByCost({
          pacote: String(it.pacote),
          quantidade,
        })) as any[];
        const res = evaluateRoute(ranked as any, price);
        rows.push({
          pacote: String(it.pacote),
          category: it.category ?? null,
          quantidade,
          price_brl: price,
          ...classifyBench(ranked as any, res),
        });
      } catch (e) {
        // Falha nossa não vira veredito contra o pacote: marcamos como
        // não avaliado (entra como saldo=falso positivo? não) — reportamos.
        rows.push({
          pacote: String(it.pacote),
          category: it.category ?? null,
          quantidade,
          price_brl: price,
          verdict: "sem_fornecedor",
          motivo: `Não consegui avaliar agora (${(e as Error).message.slice(0, 60)})`,
          fornecedor: null,
          custoBrl: null,
          faltaRecarregar: null,
          faltaEm: null,
        });
      }
    }

    return { ok: true as const, rows, next: data.offset + list.length, done: list.length < data.limit };
  });
