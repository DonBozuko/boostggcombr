import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenInput = z.object({ token: z.string().min(8) });

function checkToken(token: string) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return token === expected;
}

export const listarFornecedores = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
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
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
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
const PAINEL_URL: Record<string, string> = {
  smmhype: "https://smmhype.com",
  smmpainel: "https://smmpainel.com",
  smmpanel: "https://smmpainel.com",
  verified: "https://verifiedatacado.com",
};

/** Origem do api_url = painel do fornecedor (script SMM padrão). */
function painelFromApiUrl(apiUrl: string | null | undefined): string | null {
  const raw = String(apiUrl ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

function pixFor(slug: string): string | null {
  const s = (slug || "").toLowerCase();
  if (s.includes("smmhype")) return process.env.SMMHYPE_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("smmpainel") || s.includes("smmpanel")) return process.env.SMMPANEL_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("verified")) return process.env.VERIFIED_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("provider4") || s.includes("smmoficial")) return process.env.PROVIDER4_PIX_COPIA_COLA?.trim() || null;
  return process.env.PROVIDER_PIX_COPIA_COLA?.trim() || null;
}

export const getRecargaFornecedores = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

