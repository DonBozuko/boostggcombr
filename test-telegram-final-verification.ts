import { dispatchTelegramAlert } from "./src/lib/messaging";

async function run() {
  console.log("Enviando confirmação final de auditoria...");
  const res = await dispatchTelegramAlert(
    "🛡️ <b>AUDITORIA FORENSE v412: CONCLUÍDA</b>\n\nPROBLEMA: Comunicação com Diretor silenciada por ID expirado.\nO QUE FOI FEITO: Novo Chat ID (6301999242) capturado e blindado nos Secrets.\nRESULTADO: Canal Jarvis restabelecido e operando em regime de Ponto Único de Verdade.",
    { force: true, origem: "jarvis_audit" }
  );
  console.log("Resultado final:", JSON.stringify(res, null, 2));
}

run();
