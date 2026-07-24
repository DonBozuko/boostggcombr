// v229 — Probe: testa se os 3 fornecedores aceitam action=cancel.
// Envia order=0 (inexistente). Se painel suporta cancel, responde
// "order not found" ou similar; se não suporta, responde "incorrect action".
// NÃO cancela nada real (order 0 não existe).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/diag/probe-cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token");
        if (!token || token !== process.env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const targets = [
          { slug: "smmhype", endpoint: "https://smmhype.com/api/v2", key: process.env.SMMHYPE_API_KEY },
          { slug: "smmpainel", endpoint: "https://smmpainel.com/api/v2", key: process.env.SMMPAINEL_API_KEY },
          { slug: "verified", endpoint: "https://verifiedatacado.com/api/v2", key: process.env.VERIFIED_API_KEY },
        ];

        const results: Array<{ slug: string; http: number; body: string; supports_cancel: boolean | "unknown" }> = [];
        for (const t of targets) {
          if (!t.key) { results.push({ slug: t.slug, http: 0, body: "SEM API KEY", supports_cancel: "unknown" }); continue; }
          try {
            const form = new URLSearchParams();
            form.set("key", t.key);
            form.set("action", "cancel");
            form.set("orders", "0"); // ID inexistente = zero risco
            const res = await fetch(t.endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: form.toString(),
              signal: AbortSignal.timeout(15000),
            });
            const body = (await res.text()).slice(0, 400);
            // Perfect Panel: se aceita action, retorna array com {order:0, cancel:{...error:"..."}}
            // Se não aceita, retorna {error:"Incorrect action"} ou similar.
            const lower = body.toLowerCase();
            let supports: boolean | "unknown" = "unknown";
            if (/incorrect action|invalid action|unknown action|action not/i.test(lower)) supports = false;
            else if (/order|cancel|not found|does not exist|neexist/i.test(lower)) supports = true;
            results.push({ slug: t.slug, http: res.status, body, supports_cancel: supports });
          } catch (e: any) {
            results.push({ slug: t.slug, http: 0, body: `ERRO: ${e?.message ?? "unknown"}`, supports_cancel: "unknown" });
          }
        }

        return new Response(JSON.stringify({ ok: true, results }, null, 2), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
