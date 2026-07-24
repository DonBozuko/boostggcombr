import { createFileRoute } from "@tanstack/react-router";
import { sendTikTokServerEvent } from "@/lib/tiktok-events-api.server";

// GET /api/public/test-tiktok-event?code=TEST12345
// Dispara um CompletePayment fake pra validar a eAPI no Test Events do TikTok.
export const Route = createFileRoute("/api/public/test-tiktok-event")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        const url = new URL(request.url);
        const testCode = url.searchParams.get("code") ?? undefined;
        const orderId = `test_${Date.now()}`;

        const result = await sendTikTokServerEvent({
          event: "CompletePayment",
          orderId,
          value: 9.9,
          contentName: "Teste eAPI",
          userAgent: request.headers.get("user-agent") ?? "Mozilla/5.0",
          ip: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1",
          email: "teste@boostgg.com.br",
          externalId: orderId,
          testEventCode: testCode,
        });

        return Response.json({ orderId, testCode, result });
      },
    },
  },
});
