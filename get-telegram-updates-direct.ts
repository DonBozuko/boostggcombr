async function run() {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token) {
    console.log(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not found in env" }));
    return;
  }
  
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=5&offset=-5`);
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: String(e) }));
  }
}

run();
