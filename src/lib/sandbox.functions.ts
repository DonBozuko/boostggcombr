import { createServerFn } from "@tanstack/react-start";

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
 * Uso: validar fluxo waiting_provision + PIX Telegram + botão Recarga Confirmada
 * sem gastar dinheiro real. Cliente segue vendo checkout normal — pedido entra em
 * waiting_provision e Telegram alerta o admin.
 */
export const toggleSandboxAllProviders = createServerFn({ method: "POST" })
  .inputValidator((input: { enable: boolean }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: forn, error: fErr } = await supabaseAdmin
      .from("fornecedores")
      .select("slug, saldo_atual, saldo_atual_backup, ativo");
    if (fErr) throw new Error(fErr.message);

    if (data.enable) {
      // Zerar: guarda saldo real em backup (se ainda não guardado) e zera
      for (const f of forn ?? []) {
        if (!f.ativo) continue;
        const backup = (f as any).saldo_atual_backup;
        const saldo = Number((f as any).saldo_atual);
        // Só guarda backup se ainda não tem OU se saldo atual > 0 (evita perder backup ao re-zerar)
        const newBackup = backup != null ? backup : saldo;
        await supabaseAdmin
          .from("fornecedores")
          .update({ saldo_atual: 0, saldo_atual_backup: newBackup })
          .eq("slug", (f as any).slug);
      }
    } else {
      // Restaurar: volta saldo_atual do backup e limpa backup
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

    try {
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: "admin",
        action: data.enable ? "SANDBOX_ENABLE_ALL" : "SANDBOX_DISABLE_ALL",
        detail: { fornecedores: (forn ?? []).map((f: any) => f.slug) },
      } as any);
    } catch { /* noop */ }

    return { ok: true, enabled: data.enable };
  });
