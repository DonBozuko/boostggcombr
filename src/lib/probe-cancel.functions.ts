import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "fabiano.majestic@gmail.com";

export const runProbeCancel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (email !== ADMIN_EMAIL) throw new Error("Forbidden");

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
        form.set("orders", "0");
        const res = await fetch(t.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
          signal: AbortSignal.timeout(15000),
        });
        const body = (await res.text()).slice(0, 400);
        const lower = body.toLowerCase();
        let supports: boolean | "unknown" = "unknown";
        if (/incorrect action|invalid action|unknown action|action not/i.test(lower)) supports = false;
        else if (/order|cancel|not found|does not exist|neexist/i.test(lower)) supports = true;
        results.push({ slug: t.slug, http: res.status, body, supports_cancel: supports });
      } catch (e: any) {
        results.push({ slug: t.slug, http: 0, body: `ERRO: ${e?.message ?? "unknown"}`, supports_cancel: "unknown" });
      }
    }
    return { ok: true, results };
  });
