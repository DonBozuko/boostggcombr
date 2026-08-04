async function run() {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token) {
    console.log(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not found" }));
    return;
  }
  
  // Limpa webhook para garantir que getUpdates funcione
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  
  // Pequena pausa para o Telegram processar
  await new Promise(r => setTimeout(r, 1000));

  console.log("Aguardando novas mensagens (polling)...");
  const resp = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10&timeout=5`);
  const data = await resp.json();
  
  if (data.ok && data.result.length > 0) {
    const lastUpdate = data.result[data.result.length - 1];
    const chatId = lastUpdate.message?.chat?.id || lastUpdate.callback_query?.message?.chat?.id;
    const userName = lastUpdate.message?.from?.first_name || "Usuário";
    console.log("✅ ID CAPTURADO COM SUCESSO!");
    console.log("ID:", chatId);
    console.log("Usuário:", userName);
    console.log("Texto:", lastUpdate.message?.text);
  } else {
    console.log("Nenhuma mensagem nova encontrada. Certifique-se de que enviou '/start' para o bot.");
    console.log("Resposta bruta:", JSON.stringify(data, null, 2));
  }
}
run();
