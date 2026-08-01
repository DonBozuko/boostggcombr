import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenInput = z.object({ token: z.string().min(8) });


export const listarFornecedores = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenInput.parse(input))
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("fornecedores")
      .select("id, nome, ativo, slug, status, saldo_atual, cotacao_brl, ultima_verificacao")
      .order("prioridade", { ascending: true });
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return {
      ok: true as const,
      fornecedores: (rows ?? []) as {
        id: string;
        nome: string;
        ativo: boolean;
        slug: string;
        status: string | null;
        saldo_atual: number | null;
        cotacao_brl: number | null;
        ultima_verificacao: string | null;
      }[],
    };
  });

export const toggleFornecedorAtivo = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().min(8), id: z.string().uuid(), ativo: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("fornecedores")
      .update({ ativo: data.ativo, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("id, nome, ativo, slug, status, saldo_atual, ultima_verificacao")
      .maybeSingle();
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, fornecedor: updated };
  });

// v236 — Recarga de saldo: painel do fornecedor + Pix copia-e-cola salvo nos secrets.
// v343 — o painel passa a ser derivado do api_url do BANCO. Fornecedor novo
// (ex.: provider4/SMMOficial) já nasce com botão funcionando, sem hardcode.



export const getRecargaFornecedores = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenInput.parse(input))
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PAINEL_URL, painelFromApiUrl, pixFor } = await import("@/lib/fornecedores-recarga.server");
    const { data: rows } = await supabaseAdmin
      .from("fornecedores")
      .select("nome, slug, saldo_atual, ativo, api_url")
      .order("prioridade", { ascending: true });
    return {
      ok: true as const,
      itens: (rows ?? []).map((r: any) => {
        const slug = String(r.slug ?? "").toLowerCase();
        const painel = painelFromApiUrl(r.api_url) ?? PAINEL_URL[slug] ?? null;
        return {
          nome: r.nome as string,
          slug,
          ativo: !!r.ativo,
          saldo: typeof r.saldo_atual === "number" ? r.saldo_atual : null,
          painelUrl: painel ? `${painel}/addfunds` : null,
          pix: pixFor(slug),
        };
      }),
    };
  });

