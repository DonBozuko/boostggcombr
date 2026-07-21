import { createFileRoute } from "@tanstack/react-router";

// v158 — Backfill SMMhype service_id por match de palavra-chave sobre o catálogo
// completo. Grava apenas quando o match é INEQUÍVOCO (1 candidato). Ambíguo ou
// ausente → mantém NULL e loga em admin_audit_logs. Protegido por ADMIN_TOKEN.

type PacoteMeta = { platform: string; kind: string; extra?: string[] };

// Prefixo (2 letras) → plataforma; 3ª letra → tipo de serviço.
const PLATFORM: Record<string, string> = {
  fb: "facebook", ig: "instagram", tg: "telegram", tk: "tiktok", yt: "youtube",
};

function decodePacote(pacote: string): PacoteMeta | null {
  const p = pacote.toLowerCase();
  const platKey = p.slice(0, 2);
  const platform = PLATFORM[platKey];
  if (!platform) return null;
  // ytsub / ytv especiais
  if (p.startsWith("ytsub")) return { platform: "youtube", kind: "subscribers" };
  if (p.startsWith("ytv")) return { platform: "youtube", kind: "views" };
  const t = p[2];
  switch (platKey) {
    case "ig":
      if (t === "l") return { platform, kind: "likes" };
      if (t === "v") return { platform, kind: "views", extra: ["video"] };
      if (t === "s") return { platform, kind: "followers" };
      return null;
    case "tk":
      if (t === "l") return { platform, kind: "likes" };
      if (t === "v") return { platform, kind: "views" };
      if (t === "s") return { platform, kind: "followers" };
      return null;
    case "fb":
      if (t === "l") return { platform, kind: "likes", extra: ["page", "post"] };
      if (t === "s") return { platform, kind: "followers", extra: ["page"] };
      return null;
    case "tg":
      if (t === "c") return { platform, kind: "members", extra: ["channel"] };
      if (t === "g") return { platform, kind: "members", extra: ["group"] };
      return null;
    default:
      return null;
  }
}

type SvcRow = {
  provider_service_id: number;
  name: string;
  category: string;
  min: number;
  max: number;
  refill: boolean | null;
};

function scoreCandidate(meta: PacoteMeta, qty: number, svc: SvcRow): number {
  const hay = `${svc.category} ${svc.name}`.toLowerCase();
  // Plataforma OBRIGATÓRIA
  if (!hay.includes(meta.platform)) return 0;
  // Tipo OBRIGATÓRIO (com sinônimos)
  const kindSyn: Record<string, string[]> = {
    likes: ["like"],
    views: ["view"],
    followers: ["follower", "follow"],
    subscribers: ["subscriber", "subscribe", "sub"],
    members: ["member"],
  };
  const syn = [meta.kind, ...(kindSyn[meta.kind] ?? [])];
  if (!syn.some((s) => hay.includes(s))) return 0;
  // Faixa min/max
  if (svc.min > 0 && qty < svc.min) return 0;
  if (svc.max > 0 && qty > svc.max) return 0;
  // Score: +1 por extra que bate, +1 se tiver refill
  let sc = 10;
  for (const e of meta.extra ?? []) if (hay.includes(e)) sc += 2;
  if (svc.refill) sc += 1;
  return sc;
}

async function runBackfill() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { syncSmmhypeServices } = await import("@/lib/sync-services.server");

  // 1. Sync fresh do catálogo amplo
  await syncSmmhypeServices().catch(() => null);

  // 2. Carrega catálogo SMMhype (services_cache) + linhas NULL
  const [{ data: cache }, { data: nulos }] = await Promise.all([
    supabaseAdmin.from("services_cache").select("provider_service_id, name, category, min, max, refill"),
    supabaseAdmin
      .from("pricing_items")
      .select("pacote, quantidade")
      .is("smmhype_service_id", null),
  ]);

  const svcs = (cache ?? []) as SvcRow[];
  const rows = (nulos ?? []) as Array<{ pacote: string; quantidade: number }>;

  const matched: Array<{ pacote: string; svc_id: number; score: number }> = [];
  const ambiguous: Array<{ pacote: string; candidates: number[] }> = [];
  const missing: string[] = [];

  for (const r of rows) {
    const meta = decodePacote(r.pacote);
    if (!meta) { missing.push(r.pacote); continue; }
    const scored = svcs
      .map((s) => ({ svc: s, sc: scoreCandidate(meta, r.quantidade, s) }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc);
    if (!scored.length) { missing.push(r.pacote); continue; }
    // Match inequívoco: melhor score único (topo estritamente > segundo)
    if (scored.length === 1 || scored[0].sc > scored[1].sc) {
      matched.push({ pacote: r.pacote, svc_id: scored[0].svc.provider_service_id, score: scored[0].sc });
    } else {
      ambiguous.push({
        pacote: r.pacote,
        candidates: scored.filter((x) => x.sc === scored[0].sc).slice(0, 5).map((x) => x.svc.provider_service_id),
      });
    }
  }

  // 3. Grava matches inequívocos
  for (const m of matched) {
    await supabaseAdmin
      .from("pricing_items")
      .update({ smmhype_service_id: String(m.svc_id) })
      .eq("pacote", m.pacote);
  }

  // 4. Cobertura real
  const { count: totalItens } = await supabaseAdmin
    .from("pricing_items").select("*", { count: "exact", head: true });
  const { count: comSmmhype } = await supabaseAdmin
    .from("pricing_items").select("*", { count: "exact", head: true }).not("smmhype_service_id", "is", null);
  const cobertura = totalItens ? Math.round((comSmmhype! / totalItens) * 1000) / 10 : 0;

  // 5. Audit log imutável
  try {
    await supabaseAdmin.from("admin_audit_logs").insert({
      action: "backfill_smmhype_ids_v158",
      admin_email: "system@backfill",
      detail: {
        matched_count: matched.length,
        ambiguous_count: ambiguous.length,
        missing_count: missing.length,
        total_items: totalItens,
        smmhype_coverage_percent: cobertura,
        catalog_size: svcs.length,
        ambiguous: ambiguous.slice(0, 20),
        missing: missing.slice(0, 20),
      } as any,
    } as any);
  } catch { /* audit falha não bloqueia */ }


  return {
    ok: true as const,
    catalog_size: svcs.length,
    matched: matched.length,
    ambiguous: ambiguous.length,
    missing: missing.length,
    smmhype_coverage_percent: cobertura,
    total_items: totalItens,
    ambiguous_samples: ambiguous.slice(0, 10),
    missing_samples: missing.slice(0, 10),
  };
}

export const Route = createFileRoute("/api/public/hooks/backfill-smmhype-ids")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? new URL(request.url).searchParams.get("token");
        if (!token || (token !== process.env.ADMIN_TOKEN && token !== process.env.CRON_ADMIN_TOKEN)) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const res = await runBackfill();
          return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
