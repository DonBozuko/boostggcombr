// v214 — Endpoint HTTP para o teste seco pacote-a-pacote.
// Chamado 1x/dia por cron; também dispara na hora via botão do admin.
import { createFileRoute } from "@tanstack/react-router";

function extractToken(request: Request) {
  return (
    request.headers.get("x-admin-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("token") ??
    ""
  );
}

function authorized(token: string) {
  if (!token) return false;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return true;
  if (process.env.CRON_ADMIN_TOKEN && token === process.env.CRON_ADMIN_TOKEN) return true;
  return false;
}

export const Route = createFileRoute("/api/public/hooks/dry-run-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});

async function run(request: Request) {
  if (!authorized(extractToken(request))) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const { runDryRunAllPackages } = await import("@/lib/dry-run.server");
    const summary = await runDryRunAllPackages();

    // Alerta apenas se ≥ 10 pacotes foram pausados nesta rodada — sinal de
    // problema real de fornecedor, não ruído de configuração pontual.
    if (summary.paused >= 10 && summary.catalogsAlive > 0) {
      try {
        const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
        const top = Object.entries(summary.byReason)
          .filter(([k]) => k !== "OK")
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([r, n]) => `• ${n}× ${r}`)
          .join("\n");
        await dispatchWhatsappAlert(
          `⚠️ CATÁLOGO COM PACOTES BLOQUEADOS\n\nPROBLEMA: ${summary.paused} de ${summary.total} pacotes foram pausados no teste seco (não podem ser vendidos agora).\n\nMOTIVOS PRINCIPAIS:\n${top}\n\nO QUE FAZER: abrir Admin › Saúde do Catálogo, ver a lista vermelha e vincular fornecedor ou tirar do site.`,
        ).catch(() => {});
      } catch { /* noop */ }
    }

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
