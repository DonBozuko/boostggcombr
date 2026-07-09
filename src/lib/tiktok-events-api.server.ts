// TikTok Events API (server-side) — dobra sinal com o pixel client.
// event_id igual ao do pixel (`cp_${orderId}` / `ic_${orderId}`) garante dedup.

const ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

type ServerEventInput = {
  event: "CompletePayment" | "InitiateCheckout";
  orderId: string;
  value: number;
  contentName?: string;
  ip?: string;
  userAgent?: string;
  ttp?: string; // TikTok browser cookie _ttp se disponível
  testEventCode?: string; // TEST_ code do Test Events tab
};

export async function sendTikTokServerEvent(input: ServerEventInput): Promise<void> {
  const pixelCode = process.env.TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!pixelCode || !token) {
    console.warn("[tiktok-eapi] pixel/token ausente, pulando");
    return;
  }

  const prefix = input.event === "CompletePayment" ? "cp_" : "ic_";
  const body = {
    event_source: "web",
    event_source_id: pixelCode,
    data: [
      {
        event: input.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: `${prefix}${input.orderId}`,
        user: {
          ...(input.ip ? { ip: input.ip } : {}),
          ...(input.userAgent ? { user_agent: input.userAgent } : {}),
          ...(input.ttp ? { ttp: input.ttp } : {}),
        },
        properties: {
          currency: "BRL",
          value: Number(input.value.toFixed(2)),
          content_type: "product",
          content_id: input.orderId,
          ...(input.contentName ? { content_name: input.contentName } : {}),
        },
      },
    ],
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": token,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
    if (!res.ok || (json.code !== undefined && json.code !== 0)) {
      console.error("[tiktok-eapi] falhou", res.status, json);
    } else {
      console.log("[tiktok-eapi] ok", input.event, input.orderId);
    }
  } catch (err) {
    console.error("[tiktok-eapi] exception", err);
  }
}
