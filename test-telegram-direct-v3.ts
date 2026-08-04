async function run() {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  // Hardcoded ID capturado no passo anterior para garantir a entrega
  const chatId = "6301999242";
  
  console.log("Forçando envio para o ID capturado: 6301999242");
  
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "🚀 *AUDITORIA FORENSE CONCLUÍDA*\n\n*STATUS:* COMUNICAÇÃO RESTABELECIDA\n*ID DETECTADO:* `6301999242`\n\nJarvis está 100% operacional e conectado ao seu Telegram agora.",
      parse_mode: "Markdown"
    })
  });
  const data = await res.json();
  console.log("Resposta do Telegram:", JSON.stringify(data, null, 2));
}
run();
