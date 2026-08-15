
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function clearPhantomAlerts() {
  console.log("[v640] Iniciando limpeza de alertas fantasmas...");
  const { error } = await supabaseAdmin
    .from("jarvis_alerts")
    .delete()
    .like("mensagem", "%br-p100|sem_fornecedor%")
    .eq("origem", "bench-nao-convergencia");
  
  if (error) {
    console.error("[v640] Erro ao deletar alertas:", error);
    return { ok: false, error };
  }
  
  console.log("[v640] Alertas limpos. Reativando pacotes...");
  
  const pacotes = ['br-p100', 'br-p10k', 'br-p1k', 'br-p250', 'br-p2k', 'br-p500', 'br-p5k'];
  const { error: updateError } = await supabaseAdmin
    .from("pricing_items")
    .update({ is_sellable: true, sellable_reason: null } as any)
    .in("pacote", pacotes);

  if (updateError) {
    console.error("[v640] Erro ao reativar pacotes:", updateError);
    return { ok: false, error: updateError };
  }

  console.log("[v640] Sucesso: pacotes reativados e alertas limpos.");
  return { ok: true };
}
