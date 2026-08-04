import { dispatchTelegramAlert } from "./src/lib/messaging";

async function run() {
  console.log("Enviando alerta de teste para o Diretor...");
  const res = await dispatchTelegramAlert(
    "🚀 <b>AUDITORIA FINALIZADA</b>\n\nPROBLEMA: O Chat ID estava desatualizado.\nO QUE FAZER: Nada, eu já capturei o novo ID (6301999242) e testei agora.",
    { force: true, origem: "jarvis_audit" }
  );
  console.log("Resultado:", JSON.stringify(res, null, 2));
}

run();
