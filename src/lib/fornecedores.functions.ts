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
      .select("id, nome, ativo, slug")
      .order("prioridade", { ascending: true });
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, fornecedores: (rows ?? []) as { id: string; nome: string; ativo: boolean; slug: string }[] };
  });

export const toggleFornecedorAtivo = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().min(8), id: z.string().uuid(), ativo: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.ativo) {
      const { error: offErr } = await supabaseAdmin
        .from("fornecedores")
        .update({ ativo: false })
        .neq("id", data.id);
      if (offErr) return { ok: false as const, error: "DB_FAILED" as const };
    }
    const { error } = await supabaseAdmin
      .from("fornecedores")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const };
  });
