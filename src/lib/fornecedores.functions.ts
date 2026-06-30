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
