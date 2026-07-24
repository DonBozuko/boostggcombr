import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type JarvisAlertRow = {
  id: string;
  severidade: string;
  origem: string;
  mensagem: string;
  detalhe: string | null;
  created_at: string;
};

function checkToken(token: string | undefined) {
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && token === expected;
}

export const logJarvisAlert = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; severidade: string; origem?: string; mensagem: string; detalhe?: string }) =>
    z.object({
      token: z.string().min(8),
      severidade: z.string(),
      origem: z.string().optional(),
      mensagem: z.string(),
      detalhe: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("jarvis_alerts").insert({
      severidade: data.severidade,
      origem: data.origem ?? "system",
      mensagem: data.mensagem,
      detalhe: data.detalhe ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listJarvisAlerts = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; severidade?: string; origem?: string; limit?: number }) =>
    z.object({
      token: z.string().min(8),
      severidade: z.string().optional(),
      origem: z.string().optional(),
      limit: z.number().optional(),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<{ rows: JarvisAlertRow[]; error?: string }> => {
    if (!checkToken(data.token)) return { rows: [], error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("jarvis_alerts")
      .select("id, severidade, origem, mensagem, detalhe, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 50, 200));
    if (data.severidade) q = q.eq("severidade", data.severidade);
    if (data.origem) q = q.eq("origem", data.origem);
    const { data: rows, error } = await q;
    if (error) return { rows: [] };
    return { rows: (rows ?? []) as JarvisAlertRow[] };
  });
