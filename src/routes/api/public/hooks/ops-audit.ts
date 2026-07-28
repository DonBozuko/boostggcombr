import { createFileRoute } from "@tanstack/react-router";

// v233 — Auditoria Operacional Permanente (cron horário).
// Só manda Telegram se houver impacto real (dinheiro/cliente).
export const Route = createFileRoute("/api/public/hooks/ops-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isCronAuthorized } = await import("@/lib/cron-auth.server");
        if (!isCronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runOpsAudit } = await import("@/services/ops-audit.server");
        const report = await runOpsAudit({ notify: true });
        return Response.json({
          ok: report.ok,
          criticos: report.findings.filter((f) => f.severity === "critical").length,
          total: report.findings.length,
          telegram_enviado: report.telegram_enviado,
          findings: report.findings.map((f) => ({ code: f.code, severity: f.severity, titulo: f.titulo, problema: f.problema })),
        });
      },
    },
  },
});
