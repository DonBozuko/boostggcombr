async function run() {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token) {
    console.log(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not found" }));
    return;
  }
  
  console.log("Deletando webhook para habilitar polling...");
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  
  console.log("Aguardando mensagens...");
  const resp = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=5`);
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
