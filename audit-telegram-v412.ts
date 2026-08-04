
import { dispatchTelegramAlert } from "./src/lib/messaging";

async function test() {
  console.log("🚀 Iniciando Auditoria de Disparo Telegram (v412)...");
  
  const msg = `<b>🔔 AUDITORIA DE INTEGRIDADE BOOSTGG</b>\n\n` +
              `Status: 🟢 SISTEMA OPERACIONAL\n` +
              `Auditor: Orquestrador v412\n` +
              `Nota: Se você recebeu esta mensagem, o portão foi aberto com sucesso.`;

  const result = await dispatchTelegramAlert(msg, { severity: "critical", force: true, origem: "auditoria" });
  
  if (result.ok) {
    console.log("✅ SUCESSO: O Telegram respondeu e a mensagem foi entregue.");
  } else {
    console.error("❌ FALHA CRÍTICA:", result.detail);
    if (result.detail?.includes("chat not found")) {
      console.error("👉 DIAGNÓSTICO: O Chat ID é inválido ou o bot foi bloqueado pelo usuário.");
    }
  }
}

test().catch(console.error);
