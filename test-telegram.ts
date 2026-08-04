
import { dispatchTelegramAlert } from "./src/lib/messaging";

async function test() {
  console.log("--- TESTE DE DISPARO TELEGRAM (AUDITORIA v412) ---");
  console.log("Token:", process.env.TELEGRAM_BOT_TOKEN ? "PRESENTE" : "AUSENTE");
  console.log("Chat ID:", process.env.ADMIN_TELEGRAM_CHAT_ID ? "PRESENTE" : "AUSENTE");
  
  const res = await dispatchTelegramAlert(
    "🚨 <b>TESTE DE INTEGRIDADE BOOSTGG</b>\n\nDiretor, o Jarvis restabeleceu a voz.\n\n<b>Sistema:</b> ON\n<b>Forense:</b> ATIVO\n<b>Ritmo:</b> INDUSTRIAL",
    { force: true, origem: "auditoria-v412" }
  );
  
  console.log("Resultado:", JSON.stringify(res, null, 2));
}

test().catch(console.error);
