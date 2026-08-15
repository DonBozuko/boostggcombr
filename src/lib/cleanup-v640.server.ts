
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function clearPhantomAlerts() {
  console.log("[v640] Iniciando limpeza de alertas fantasmas...");
  
  // Limpa alertas persistentes no banco
  const { error: alertError } = await supabaseAdmin
    .from("jarvis_alerts")
    .delete()
    .or("mensagem.ilike.%br-p100|sem_fornecedor%,mensagem.ilike.%br-p10k|sem_fornecedor%,mensagem.ilike.%br-p1k|sem_fornecedor%,mensagem.ilike.%br-p250|sem_fornecedor%,mensagem.ilike.%br-p2k|sem_fornecedor%,mensagem.ilike.%br-p500|sem_fornecedor%,mensagem.ilike.%br-p5k|sem_fornecedor%")
    .eq("origem", "bench-nao-convergencia");
  
  if (alertError) {
    console.error("[v640] Erro ao deletar alertas:", alertError);
  }
  
  // v372 — a Bancada não grava is_sellable, ela grava vetos na shelf_vetoes.
  // Limpa os vetos da bancada para esses pacotes
  const pacotes = ['br-p100', 'br-p10k', 'br-p1k', 'br-p250', 'br-p2k', 'br-p500', 'br-p5k'];
  console.log("[v640] Limpando vetos de vitrine...");
  const { error: vetoError } = await supabaseAdmin
    .from("shelf_vetoes")
    .delete()
    .eq("source", "bancada")
    .in("pacote", pacotes);

  if (vetoError) {
    console.error("[v640] Erro ao limpar vetos:", vetoError);
  }

  // Reconcilia a vitrine para aplicar as mudanças
  const { reconcileShelf } = await import("./shelf-authority.server");
  const report = await reconcileShelf(pacotes);

  // v396 — Autoridade de Preço: garante que os preços estão corretos após a religação
  try {
    const { enforcePriceAuthority } = await import("./price-authority.server");
    await enforcePriceAuthority("cleanup-v640");
    console.log("[v640] Autoridade de preço executada.");
  } catch (e) {
    console.error("[v640] Erro ao rodar autoridade de preço:", e);
  }

  console.log("[v640] Sucesso: pacotes religados via reconciliação.", report);
  return { ok: true, report };
}
