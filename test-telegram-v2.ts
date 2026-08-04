async function run() {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  const chatId = process.env['ADMIN_TELEGRAM_CHAT_ID'];
  
  console.log("Token:", token ? "present" : "missing");
  console.log("Chat ID:", chatId);
  
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "✅ *CONEXÃO RESTABELECIDA*\n\nEu capturei seu ID real (6301999242). O Jarvis está de volta ao posto.",
      parse_mode: "Markdown"
    })
  });
  const text = await res.text();
  console.log("Resultado:", text);
}
run();
