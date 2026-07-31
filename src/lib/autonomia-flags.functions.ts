// v392 — Liga/desliga a autonomia de nível 2 e 3 (escada de autonomia).
// Nível 1 não tem flag: conserta sempre. Aqui só entra o que precisa do dono.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACOES } from "@/lib/autonomy-ladder";
import { flagFromValue } from "@/lib/autonomy-flags.server";

const ADMIN_EMAIL = "fabiano.majestic@gmail.com";

const FLAGS = ACOES.filter((a) => a.flag).map((a) => ({
  key: a.flag as string,
  nome: a.nome,
  nivel: a.nivel,
  teto: a.teto,
  rollback: a.rollback,
  pronto: Boolean(a.executor),
}));

export type AutonomiaFlag = (typeof FLAGS)[number] & { ligada: boolean };

export const getAutonomiaFlags = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ flags: AutonomiaFlag[] }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("admin_settings")
        .select("key, value")
        .in("key", FLAGS.map((f) => f.key));
      const map = new Map(((data as any[]) ?? []).map((r) => [String(r.key), r.value]));
      return { flags: FLAGS.map((f) => ({ ...f, ligada: flagFromValue(map.get(f.key)) })) };
    } catch {
      return { flags: FLAGS.map((f) => ({ ...f, ligada: false })) };
    }
  },
);

export const setAutonomiaFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; enable: boolean }) => input)
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (email !== ADMIN_EMAIL) throw new Error("Forbidden");
    const alvo = FLAGS.find((f) => f.key === data.key);
    if (!alvo) throw new Error("Flag desconhecida");
    if (data.enable && !alvo.pronto) throw new Error("Essa automação ainda não tem executor — não dá pra ligar.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("admin_settings")
      .upsert(
        { key: alvo.key, value: { enabled: data.enable, ts: new Date().toISOString() } as any },
        { onConflict: "key" },
      );
    try {
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: email,
        action: data.enable ? "AUTONOMIA_ON" : "AUTONOMIA_OFF",
        detail: { key: alvo.key, nivel: alvo.nivel, teto: alvo.teto } as any,
      } as any);
    } catch { /* */ }
    return { ok: true, key: alvo.key, ligada: data.enable };
  });
