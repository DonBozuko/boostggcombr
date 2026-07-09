import { createFileRoute } from "@tanstack/react-router";
import { sendTikTokServerEvent } from "@/lib/tiktok-events-api.server";

// GET /api/public/test-tiktok-event?code=TEST12345
// Dispara um CompletePayment fake pra validar a eAPI no Test Events do TikTok.
export const Route = createFileRoute("/api/public/test-tiktok-event")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const testCode = url.searchParams.get("code") ?? undefined;
        const orderId = `test_${Date.now()}`;

        await sendTikTokServerEvent({
          event: "CompletePayment",
          orderId,
          value: 9.9,
          contentName: "Teste eAPI",
          userAgent: request.headers.get("user-agent") ?? undefined,
          ip: request.headers.get("cf-connecting-ip") ?? undefined,
          testEventCode: testCode,
        });

        return Response.json({ ok: true, orderId, testCode });
      },
    },
  },
});
