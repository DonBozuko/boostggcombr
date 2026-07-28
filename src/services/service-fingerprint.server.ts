// v312 — Impressão digital do serviço: aplica no banco.
// Lê os vínculos do catálogo, compara com o nome atual no cache do fornecedor
// e DESVINCULA a rota cujo produto mudou por trás do mesmo ID.
// Nunca pausa pacote que ainda tem rota boa (regra v310: desvincular antes de pausar).
import {
  decideFingerprints,
  fingerprintKey,
  type FingerprintLink,
  type FingerprintRecord,
} from "@/lib/service-fingerprint";
import { serviceKey, serviceMatchesIntent } from "@/lib/catalog-coherence";

const ID_COLUMNS: Array<{ col: string; provider: string }> = [
  { col: "smmhype_service_id", provider: "smmhype" },
  { col: "smmhype_auto_id", provider: "smmhype" },
  { col: "provider_service_id", provider: "smmhype" },
  { col: "smmpanel_service_id", provider: "smmpanel" },
  { col: "smmpanel_auto_id", provider: "smmpanel" },
  { col: "verified_service_id", provider: "verified" },
  { col: "verified_auto_id", provider: "verified" },
  { col: "provider4_service_id", provider: "provider4" },
  { col: "provider4_auto_id", provider: "provider4" },
];

const CACHE_TABLES: Array<{ table: string; provider: string }> = [
  { table: "services_cache", provider: "smmhype" },
  { table: "smmpanel_services_cache", provider: "smmpanel" },
  { table: "verified_services_cache", provider: "verified" },
  { table: "provider4_services_cache", provider: "provider4" },
];

const PAGE = 1000;
const PAUSE_PREFIX = "impressão digital";

export type FingerprintRunResult = {
  checked: number;
  baselined: number;
  drift: Array<{ pacote: string; col: string; provider: string; id: string; de: string; para: string }>;
  /** v314 — vínculos novos recusados por não baterem com a intenção do pacote. */
  suspects: number;
  unlinked: string[];
  paused: string[];
  errors: number;
};

async function readAllPages<T>(
  table: string,
  columns: string,
): Promise<T[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabaseAdmin.from(table as any).select(columns).range(from, from + PAGE - 1);
    const page = ((data as any[]) ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export async function runServiceFingerprints(): Promise<FingerprintRunResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result: FingerprintRunResult = {
    checked: 0,
    baselined: 0,
    drift: [],
    suspects: 0,
    unlinked: [],
    paused: [],
    errors: 0,
  };

  const items = await readAllPages<any>(
    "pricing_items",
    ["pacote", "category", "is_sellable", ...ID_COLUMNS.map((c) => c.col)].join(", "),
  );

  // Nomes atuais por fornecedor:id (paginado — cache tem 6k+ linhas).
  const serviceNames = new Map<string, string>();
  await Promise.all(
    CACHE_TABLES.map(async ({ table, provider }) => {
      try {
        const rows = await readAllPages<any>(table, "provider_service_id, name");
        for (const s of rows) {
          const id = String(s.provider_service_id ?? "").trim();
          if (id && s.name) serviceNames.set(serviceKey({ provider, id }), String(s.name));
        }
      } catch { /* cache ausente não invalida a rodada */ }
    }),
  );

  const storedRows = await readAllPages<any>(
    "service_fingerprints",
    "pacote, col, provider, service_id, service_name, name_sig",
  );
  const stored = new Map<string, FingerprintRecord>();
  for (const r of storedRows) stored.set(fingerprintKey(String(r.pacote), String(r.col)), r as FingerprintRecord);

  const links: FingerprintLink[] = [];
  const linksByPacote = new Map<string, FingerprintLink[]>();
  for (const item of items) {
    for (const { col, provider } of ID_COLUMNS) {
      const v = item[col];
      if (v === null || v === undefined || String(v).trim() === "") continue;
      const id = String(v).trim();
      const link: FingerprintLink = {
        pacote: String(item.pacote),
        col,
        provider,
        service_id: id,
        current_name: serviceNames.get(serviceKey({ provider, id })) ?? null,
        category: item.category ?? null,
      };
      links.push(link);
      const lista = linksByPacote.get(link.pacote) ?? [];
      lista.push(link);
      linksByPacote.set(link.pacote, lista);
    }
  }

  result.checked = links.length;
  const decisions = decideFingerprints(links, stored, serviceMatchesIntent);

  const upserts: any[] = [];
  const now = new Date().toISOString();
  const driftPorPacote = new Map<string, FingerprintLink[]>();

  for (const d of decisions) {
    if (d.action === "baseline") {
      upserts.push({
        pacote: d.link.pacote,
        col: d.link.col,
        provider: d.link.provider,
        service_id: d.link.service_id,
        service_name: d.link.current_name,
        name_sig: d.sig,
        bound_at: now,
        checked_at: now,
      });
      result.baselined += 1;
    } else if (d.action === "ok") {
      upserts.push({
        pacote: d.link.pacote,
        col: d.link.col,
        provider: d.link.provider,
        service_id: d.link.service_id,
        service_name: d.link.current_name,
        name_sig: stored.get(fingerprintKey(d.link.pacote, d.link.col))!.name_sig,
        checked_at: now,
      });
    } else if (d.action === "rename") {
      // v314 — mesmo produto, nome novo: atualiza a assinatura e mantém a rota.
      upserts.push({
        pacote: d.link.pacote,
        col: d.link.col,
        provider: d.link.provider,
        service_id: d.link.service_id,
        service_name: d.link.current_name,
        name_sig: d.sig,
        checked_at: now,
      });
    } else if (d.action === "suspect" || d.action === "drift") {
      result.drift.push({
        pacote: d.link.pacote,
        col: d.link.col,
        provider: d.link.provider,
        id: d.link.service_id,
        de: d.action === "drift" ? d.from : "(vínculo novo)",
        para: d.action === "drift" ? d.to : `${d.link.current_name} — ${d.motivo}`,
      });
      const lista = driftPorPacote.get(d.link.pacote) ?? [];
      lista.push(d.link);
      driftPorPacote.set(d.link.pacote, lista);
    }
  }

  // Grava baselines/checagens em lotes.
  for (let i = 0; i < upserts.length; i += 500) {
    const { error } = await supabaseAdmin
      .from("service_fingerprints" as any)
      .upsert(upserts.slice(i, i + 500), { onConflict: "pacote,col" });
    if (error) result.errors += 1;
  }

  // Desvincula rota podre. Só pausa se o pacote ficar sem nenhuma rota.
  for (const [pacote, ruins] of driftPorPacote) {
    const todas = linksByPacote.get(pacote) ?? [];
    const colsRuins = new Set(ruins.map((r) => r.col));
    const sobra = todas.some((l) => !colsRuins.has(l.col));

    const patch: Record<string, null> = {};
    for (const col of colsRuins) patch[col] = null;

    const { error } = await supabaseAdmin.from("pricing_items" as any).update(patch).eq("pacote", pacote);
    if (error) { result.errors += 1; continue; }
    result.unlinked.push(pacote);

    // Marca o histórico do vínculo derrubado (evita re-baseline silencioso).
    for (const r of ruins) {
      await supabaseAdmin
        .from("service_fingerprints" as any)
        .update({
          drift_count: (stored.get(fingerprintKey(pacote, r.col)) as any)?.drift_count
            ? Number((stored.get(fingerprintKey(pacote, r.col)) as any).drift_count) + 1
            : 1,
          last_drift_at: now,
          last_drift_name: r.current_name,
          checked_at: now,
        })
        .eq("pacote", pacote)
        .eq("col", r.col);
    }

    if (!sobra) {
      const motivo = `${PAUSE_PREFIX}: fornecedor trocou o produto do id ${ruins[0].provider} ${ruins[0].service_id}`;
      const { error: e2, data } = await supabaseAdmin
        .from("pricing_items" as any)
        .update({ is_sellable: false, sellable_reason: motivo.slice(0, 400) })
        .eq("pacote", pacote)
        .neq("is_sellable", false)
        .select("pacote");
      if (e2) { result.errors += 1; continue; }
      if ((data as any[])?.length) result.paused.push(pacote);
    }
  }

  if (result.drift.length > 0) {
    console.warn(
      `[fingerprint] v312 ${result.drift.length} vínculo(s) trocaram de produto no fornecedor:`,
      result.drift.slice(0, 10),
    );
  }
  return result;
}
