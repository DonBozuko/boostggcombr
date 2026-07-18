// v190 — Recuperação de checkout: registra tentativa antes do Pix ser gerado.
// Público (sem auth) — só INSERT via supabaseAdmin. Sem PII sensível (só @ público + valor).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  instagram_user: z.string().trim().min(1).max(120),
  plan_id: z.string().max(60).optional().nullable(),
  network: z.string().max(20).optional().nullable(),
  categoria: z.string().max(20).optional().nullable(),
  quantidade: z.number().int().nonnegative().max(10_000_000).optional().nullable(),
  valor: z.number().nonnegative().max(100_000).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  utm_source: z.string().max(80).optional().nullable(),
  utm_medium: z.string().max(80).optional().nullable(),
  utm_campaign: z.string().max(120).optional().nullable(),
  utm_content: z.string().max(120).optional().nullable(),
  utm_term: z.string().max(120).optional().nullable(),
});

export const Route = createFileRoute("/api/public/checkout-attempt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = schema.safeParse(raw);
          if (!parsed.success) {
            return new Response("Bad Request", { status: 400 });
          }
          const ua = (request.headers.get("user-agent") ?? "").slice(0, 300);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("checkout_attempts").insert({
            ...parsed.data,
            user_agent: ua,
          });
          if (error) {
            console.error("[checkout-attempt] insert error:", error.message);
            return new Response("Error", { status: 500 });
          }
          return Response.json({ ok: true });
        } catch (err) {
          console.error("[checkout-attempt] unexpected:", err);
          return new Response("Error", { status: 500 });
        }
      },
    },
  },
});
