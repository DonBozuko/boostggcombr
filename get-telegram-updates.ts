import { createServerFn } from "@tanstack/react-start";

export const getUpdates = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return { error: "Token not found" };
    
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=5&offset=-5`);
      const data = await resp.json();
      return data;
    } catch (e) {
      return { error: String(e) };
    }
  });
