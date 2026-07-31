// v392 — Leitura das flags da escada de autonomia (nível 2 e 3).
//
// Fonte única: admin_settings. Aceita `true`, `{ "enabled": true }` ou
// `{ "value": true }` porque o painel grava em formatos diferentes.
// Fail-closed: erro de leitura = flag DESLIGADA (nunca liga sozinha).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function flagFromValue(value: unknown): boolean {
  if (value === true || value === "true") return true;
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return v.enabled === true || v.value === true || v.ligado === true;
  }
  return false;
}

export async function autonomiaLigada(key: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return flagFromValue((data as any)?.value);
  } catch {
    return false;
  }
}
