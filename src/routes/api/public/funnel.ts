// v363 — Recebe as etapas do funil. Público, só grava (nunca lê).
import { createFileRoute } from "@tanstack/react-router";
import { isInternalPath, isInternalTraffic } from "@/lib/traffic-source";
import { z } from "zod";

const STEPS = [
  "abriu_vitrine",
  "escolheu_pacote",
  "preencheu_perfil",
  "enviou_formulario",
  "pix_gerado",
  "pix_falhou",
  "pix_copiado",
  "pagou",
] as const;

const schema = z.object({
  step: z.enum(STEPS),
  session_id: z.string().max(64).optional().nullable(),
  device_id: z.string().max(64).optional().nullable(),
  plan_id: z.string().max(60).optional().nullable(),
  categoria: z.string().max(30).optional().nullable(),
  valor: z.number().nonnegative().max(1_000_000).optional().nullable(),
  path: z.string().max(300).optional().nullable(),
  detail: z.string().max(300).optional().nullable(),
});

export const Route = createFileRoute("/api/public/funnel")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204 }),
      POST: async ({ request }) => {
        try {
          const parsed = schema.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return new Response(null, { status: 204 });

          const d = parsed.data;
          if (d.path && isInternalPath(d.path)) return new Response(null, { status: 204 });
          if (isInternalTraffic(request.headers.get("referer"))) {
            return new Response(null, { status: 204 });
          }
          const ua = request.headers.get("user-agent") ?? "";
          if (/bot|crawler|spider|preview|monitor|curl|wget/i.test(ua)) {
            return new Response(null, { status: 204 });
          }

          const { checkRateLimit, clientIpFrom } = await import("@/lib/rate-limit.server");
          const rl = await checkRateLimit("funnel", clientIpFrom(request.headers), 120, 300);
          if (!rl.allowed) return new Response(null, { status: 204 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("funnel_events" as never).insert({
            step: d.step,
            session_id: d.session_id ?? null,
            device_id: d.device_id ?? null,
            plan_id: d.plan_id ?? null,
            categoria: d.categoria ?? null,
            valor: d.valor ?? null,
            path: d.path ?? null,
            detail: d.detail ?? null,
          } as never);

          return new Response(null, { status: 204 });
        } catch {
          return new Response(null, { status: 204 });
        }
      },
    },
  },
});
