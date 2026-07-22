import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "fabiano.majestic@gmail.com";

export const getSandboxEnabled = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "sandbox_mode")
      .maybeSingle();
    const enabled = !!(data?.value as { enabled?: boolean } | null)?.enabled;
    const { data: forn } = await supabaseAdmin
      .from("fornecedores")
      .select("slug, nome, saldo_atual, saldo_atual_backup, ativo");
    return { enabled, fornecedores: forn ?? [] };
  } catch {
    return { enabled: false, fornecedores: [] };
  }
});

/**
 * Modo Teste Global: zera saldo_atual de TODOS fornecedores ativos (guardando backup)
 * ou restaura de backup. NÃO toca em painel real dos fornecedores.
 *
 * v206 — Auth obrigatória. Só o admin master pode chamar.
 * Antes: qualquer chamador da server function zerava saldo do banco.
 */
export const toggleSandboxAllProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enable: boolean }) => input)
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (email !== ADMIN_EMAIL) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: forn, error: fErr } = await supabaseAdmin
      .from("fornecedores")
      .select("slug, saldo_atual, saldo_atual_backup, ativo");
    if (fErr) throw new Error(fErr.message);

    if (data.enable) {
      for (const f of forn ?? []) {
        if (!f.ativo) continue;
        const backup = (f as any).saldo_atual_backup;
        const saldo = Number((f as any).saldo_atual);
        const newBackup = backup != null ? backup : saldo;
        await supabaseAdmin
          .from("fornecedores")
          .update({ saldo_atual: 0, saldo_atual_backup: newBackup })
          .eq("slug", (f as any).slug);
      }
    } else {
      for (const f of forn ?? []) {
        const backup = (f as any).saldo_atual_backup;
        if (backup == null) continue;
        await supabaseAdmin
          .from("fornecedores")
          .update({ saldo_atual: backup, saldo_atual_backup: null })
          .eq("slug", (f as any).slug);
      }
    }

    await supabaseAdmin
      .from("admin_settings")
      .upsert({ key: "sandbox_mode", value: { enabled: data.enable, ts: new Date().toISOString() } as any }, { onConflict: "key" });

    // v206 — Log agora quebra silêncio: se audit falhar, alerta o admin.
    try {
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: email,
        action: data.enable ? "SANDBOX_ENABLE_ALL" : "SANDBOX_DISABLE_ALL",
        detail: { fornecedores: (forn ?? []).map((f: any) => f.slug) },
      } as any);
    } catch (e) {
      console.error("[sandbox] falha no audit log — ação executou mas sem rastro:", e);
      try {
        const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
        await dispatchWhatsappAlert(
          `⚠️ SANDBOX SEM RASTRO\n\nPROBLEMA: ${email} ${data.enable ? "ATIVOU" : "DESLIGOU"} o modo teste (zera saldos) mas o log de auditoria falhou.\n\nO QUE FAZER: revisar admin_audit_logs; se admin_email='${email}' não aparece nas últimas horas, temos problema de RLS/tabela.`,
        ).catch(() => {});
      } catch { /* */ }
    }

    return { ok: true, enabled: data.enable };
  });
