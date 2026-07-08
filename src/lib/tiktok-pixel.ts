// Helpers para disparar eventos TikTok Pixel manualmente.
// Auto-tracking do painel deve ficar DESLIGADO — só esses eventos importam.

type TTQ = {
  track: (event: string, data?: Record<string, unknown>, opts?: { event_id?: string }) => void;
  identify?: (data: Record<string, unknown>) => void;
};

function ttq(): TTQ | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ttq?: TTQ };
  return w.ttq ?? null;
}

export function trackInitiateCheckout(params: {
  orderId: string;
  value: number;
  contentId?: string;
  contentName?: string;
}) {
  ttq()?.track(
    "InitiateCheckout",
    {
      value: params.value,
      currency: "BRL",
      content_type: "product",
      content_id: params.contentId ?? params.orderId,
      content_name: params.contentName,
    },
    { event_id: `ic_${params.orderId}` },
  );
}

export function trackCompletePayment(params: {
  orderId: string;
  value: number;
  contentId?: string;
  contentName?: string;
}) {
  ttq()?.track(
    "CompletePayment",
    {
      value: params.value,
      currency: "BRL",
      content_type: "product",
      content_id: params.contentId ?? params.orderId,
      content_name: params.contentName,
    },
    { event_id: `cp_${params.orderId}` },
  );
}
