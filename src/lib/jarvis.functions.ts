import { createServerFn } from "@tanstack/react-start";


export type JarvisAlertRow = {
  id: string;
  severidade: string;
  origem: string;
  mensagem: string;
  detalhe: string | null;
  created_at: string;
};

export const logJarvisAlert = createServerFn({ method: "POST" })
  .inputValidator((input: { severidade: string; origem?: string; mensagem: string; detalhe?: string }) => input)
  .handler(async ({ data }) => {
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

export const listJarvisAlerts = createServerFn({ method: "GET" })
  .inputValidator((input: { severidade?: string; origem?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<{ rows: JarvisAlertRow[] }> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
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
