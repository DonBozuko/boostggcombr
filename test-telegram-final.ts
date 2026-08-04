import { dispatchWhatsappAlert } from "./src/lib/whatsapp-alert.server";

async function test() {
  console.log("--- TESTE DE COMUNICAÇÃO JARVIS ---");
  const msg = "✅ AUDITORIA DE INTEGRIDADE CONCLUÍDA\n\nSTATUS: SISTEMA OPERACIONAL\nVITRINE: 100% ONLINE\nPAGAMENTOS: WEBHOOK ATIVO\n\nO Jarvis confirmou que o Triângulo de Aço está intacto e monitorando.";
  
  try {
    const res = await dispatchWhatsappAlert(msg, { force: true });
    console.log("Resultado do envio:", res);
  } catch (e) {
    console.error("Falha fatal no envio:", e);
  }
}

test();
