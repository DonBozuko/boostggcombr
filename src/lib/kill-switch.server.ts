// Kill Switch Global (v182) — Um único ponto de parada de emergência.
// Quando ligado (`admin_settings.global_kill.blocked = true`):
//  - criarPedido recusa novos pedidos (não chama MP).
//  - mp-webhook ignora aprovações (não credita, não provisiona).
// Uso: em situações de fraude, bug crítico ou provider comprometido.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type KillState = {
  blocked: boolean;
  reason: string | null;
  activated_at: string | null;
};

export async function getKillSwitch(): Promise<KillState> {
  try {
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "global_kill")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<KillState>;
    return {
      blocked: v.blocked === true,
      reason: v.reason ?? null,
      activated_at: v.activated_at ?? null,
    };
  } catch (err) {
    console.error("[kill-switch] leitura falhou (fail-open):", err);
    return { blocked: false, reason: null, activated_at: null };
  }
}

export async function isGloballyBlocked(): Promise<boolean> {
  const s = await getKillSwitch();
  return s.blocked;
}
