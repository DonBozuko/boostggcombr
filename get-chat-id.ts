
async function findChatId() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("ERRO: TELEGRAM_BOT_TOKEN não encontrado.");
    return;
  }
  
  console.log("📡 Polling updates for bot:", botToken.slice(0, 10) + "...");
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=-1`);
  const data = await res.json();
  
  if (data.ok && data.result.length > 0) {
    const lastUpdate = data.result[data.result.length - 1];
    const chat = lastUpdate.message?.chat || lastUpdate.callback_query?.message?.chat;
    if (chat) {
      console.log("✅ Chat ID detectado:", chat.id);
      console.log("👤 Usuário:", chat.first_name || chat.username);
    }
  } else {
    console.log("ℹ️ Nenhuma mensagem nova detectada. Por favor, envie /start para o bot agora.");
  }
}

findChatId().catch(console.error);
