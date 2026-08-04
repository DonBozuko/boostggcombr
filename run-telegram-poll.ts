import { getUpdates } from "./get-telegram-updates";

async function run() {
  console.log("Polling Telegram for updates...");
  const updates = await getUpdates();
  console.log(JSON.stringify(updates, null, 2));
}

run();
