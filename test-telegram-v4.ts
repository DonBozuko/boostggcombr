async function run() {
  const token = "8886192403:AAG_o7pj31SkTym088QAt1_Y6Khfjx9pP9g";
  const chatId = "6301999242";
  
  console.log("Forçando envio com valores literais validados...");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "🛡️ *AUDITORIA FORENSE v412: CONCLUÍDA*\n\n*STATUS:* CANAL 100% OPERACIONAL\n*DIRETOR:* RECONECTADO\n\nJarvis reassumiu o monitoramento. Triângulo de Aço preservado.",
      parse_mode: "Markdown"
    })
  });
  const text = await res.text();
  console.log("Resposta literal:", text);
}
run();
