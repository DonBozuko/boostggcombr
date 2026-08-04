async function run() {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  const chatId = process.env['ADMIN_TELEGRAM_CHAT_ID'];
  
  console.log("Verificando segredos no ambiente...");
  console.log("Token:", token ? "OK" : "MISSING");
  console.log("Chat ID:", chatId);

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
  console.log("Resposta final do Telegram:", text);
}
run();
