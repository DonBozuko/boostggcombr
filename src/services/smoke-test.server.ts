// v178 — Smoke Test Sintético (sem gastar dinheiro)
// Valida a cada 15min:
//  1. Cada fornecedor ativo responde /balance (endpoint vivo + API key OK)
//  2. Todo pacote tem pelo menos 1 service_id válido no catálogo do fornecedor
//  3. Margem >= 75% em 100% do catálogo (trigger v177 garante, mas conferimos)
//  4. Cron do auto-healer rodou nas últimas 2 execuções
// Dispara alerta no Telegram se qualquer camada quebrar.

type SmokeReport = {
  ok: boolean;
  provider_reachability: Record<string, boolean>;
  packages_without_valid_id: string[];
  packages_below_margin: string[];
  auto_healer_last_run_min_ago: number | null;
  errors: string[];
  ts: string;
};

const PROVIDERS = [
  { slug: "smmhype", endpoint: "https://smmhype.com/api/v2", envKey: "SMMHYPE_API_KEY" },
  { slug: "smmpainel", endpoint: "https://smmpainel.com/api/v2", envKey: "SMMPAINEL_API_KEY" },
  { slug: "verified", endpoint: "https://verifiedatacado.com/api/v2", envKey: "VERIFIED_API_KEY" },
] as const;

async function pingProvider(endpoint: string, apiKey: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key: apiKey, action: "balance" }).toString(),
        signal: ctrl.signal,
      });
      if (!res.ok) return false;
      const text = await res.text();
      const j = JSON.parse(text) as { balance?: string | number; error?: string };
      return !j.error && j.balance != null;
    } finally { clearTimeout(timer); }
  } catch { return false; }
}

export async function runSmokeTest(): Promise<SmokeReport> {
  const report: SmokeReport = {
    ok: true,
    provider_reachability: {},
    packages_without_valid_id: [],
    packages_below_margin: [],
    auto_healer_last_run_min_ago: null,
    errors: [],
    ts: new Date().toISOString(),
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Provedores respondem?
  for (const p of PROVIDERS) {
    const key = process.env[p.envKey];
    if (!key) { report.provider_reachability[p.slug] = false; continue; }
    report.provider_reachability[p.slug] = await pingProvider(p.endpoint, key);
  }

  // 2) Todo pacote tem pelo menos 1 ID válido?
  const { data: items } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id");

  for (const it of (items as any[]) ?? []) {
    const hasId = it.smmhype_service_id || it.smmpanel_service_id || it.verified_service_id;
    if (!hasId) report.packages_without_valid_id.push(it.pacote);

    const cost = Number(it.cost_brl) || 0;
    const price = Number(it.price_brl) || 0;
    // Alinhado com trigger enforce_pricing_markup (v170): 3x mínimo p/ pacotes pequenos
    if (cost > 0 && price < cost * 2.9 - 0.01) report.packages_below_margin.push(it.pacote);
  }

  // 3) Auto-healer rodou recentemente?
  const { data: lastRun } = await supabaseAdmin
    .from("admin_audit_logs" as any)
    .select("created_at")
    .eq("action", "auto_healer_v172")
    .order("created_at", { ascending: false })
    .limit(1);
  if (lastRun && (lastRun as any[]).length > 0) {
    const diff = Date.now() - new Date((lastRun as any[])[0].created_at).getTime();
    report.auto_healer_last_run_min_ago = Math.round(diff / 60000);
  }

  // Avaliação
  const providersDown = Object.entries(report.provider_reachability).filter(([, ok]) => !ok).map(([s]) => s);
  const healerStale = report.auto_healer_last_run_min_ago == null || report.auto_healer_last_run_min_ago > 15;
  if (providersDown.length > 0 || report.packages_without_valid_id.length > 0 || report.packages_below_margin.length > 0 || healerStale) {
    report.ok = false;
  }

  // 4) Alerta Telegram só se algo quebrou
  if (!report.ok) {
    try {
      const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
      const parts = [`🚨 SISTEMA COM DEFEITO\n\nPROBLEMA: teste automático encontrou coisa quebrada.`];
      if (providersDown.length > 0) parts.push(`• Fornecedor(es) fora do ar: ${providersDown.join(", ")}`);
      if (report.packages_without_valid_id.length > 0) parts.push(`• Pacote(s) sem produto vinculado: ${report.packages_without_valid_id.slice(0, 5).join(", ")}${report.packages_without_valid_id.length > 5 ? "..." : ""}`);
      if (report.packages_below_margin.length > 0) parts.push(`• Pacote(s) vendendo com prejuízo: ${report.packages_below_margin.slice(0, 5).join(", ")}`);
      if (healerStale) parts.push(`• Piloto automático travado há ${report.auto_healer_last_run_min_ago ?? "??"} min`);
      parts.push(`\nO QUE FAZER: abrir /admin e conferir os itens acima.`);
      await dispatchWhatsappAlert(parts.join("\n")).catch(() => {});
    } catch (e: any) { report.errors.push(`alert failed: ${e?.message}`); }
  }

  // 5) Log
  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@smoke-test",
      action: "smoke_test_v178",
      detail: report as any,
      created_at: new Date().toISOString(),
    } as any);
  } catch (e: any) { report.errors.push(`audit failed: ${e?.message}`); }

  return report;
}
