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

export type ServerEventResult =
  | { ok: true; response: unknown }
  | { ok: false; reason: string; response?: unknown; status?: number };

export async function sendTikTokServerEvent(input: ServerEventInput): Promise<ServerEventResult> {
  const pixelCode = process.env.TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!pixelCode || !token) {
    console.warn("[tiktok-eapi] pixel/token ausente, pulando");
    return { ok: false, reason: `env ausente: pixel=${!!pixelCode} token=${!!token}` };
  }

  const prefix = input.event === "CompletePayment" ? "cp_" : "ic_";
  const body: Record<string, unknown> = {
    event_source: "web",
    event_source_id: pixelCode,
    ...(input.testEventCode ? { test_event_code: input.testEventCode } : {}),
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
      return { ok: false, reason: json.message ?? `http ${res.status}`, response: json, status: res.status };
    }
    console.log("[tiktok-eapi] ok", input.event, input.orderId);
    return { ok: true, response: json };
  } catch (err) {
    console.error("[tiktok-eapi] exception", err);
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

