
import { dispatchTelegramAlert } from "./src/lib/messaging";

async function test() {
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  console.log("🔍 Parâmetros de Auditoria:");
  console.log("Chat ID:", chatId ? `${chatId.slice(0, 4)}***` : "MISSING");
  console.log("Bot Token:", token ? `${token.slice(0, 10)}...` : "MISSING");

  const msg = `<b>🔔 AUDITORIA V412</b>\nStatus: TESTE`;
  const result = await dispatchTelegramAlert(msg, { severity: "critical", force: true });
  
  console.log("Resultado:", JSON.stringify(result));
}

test().catch(console.error);
