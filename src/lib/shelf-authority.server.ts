// v372 — Autoridade Única de Vitrine (aplicação no banco).
// ÚNICO módulo do sistema autorizado a gravar `pricing_items.is_sellable`.
// Todos os outros motores votam via `syncShelfVetoes` / `addShelfVeto`.
// Trava permanente: `src/__tests__/shelf-single-writer.test.ts`.

import {
  decidirVitrine,
  VETO_TTL_HORAS,
  type ShelfSource,
  type ShelfVeto,
} from "./shelf-authority";

export type ShelfReport = {
  avaliados: number;
  pausados: string[];
  religados: string[];
  errors: number;
};

function expiraEm(source: ShelfSource, ttlHoras?: number): string {
  const horas = ttlHoras ?? VETO_TTL_HORAS[source] ?? 24;
  return new Date(Date.now() + horas * 3600_000).toISOString();
}

/**
 * O motor declara TODOS os vetos que ele enxerga agora. Vetos antigos da mesma
 * origem que não aparecem mais na lista são removidos — é assim que o pacote
 * volta sozinho, sem cada motor precisar do próprio código de religamento.
 */
export async function syncShelfVetoes(
  source: ShelfSource,
  entries: { pacote: string; motivo: string }[],
  ttlHoras?: number,
): Promise<ShelfReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const expires_at = expiraEm(source, ttlHoras);

  const { data: antigos } = await supabaseAdmin
    .from("shelf_vetoes" as any)
    .select("pacote")
    .eq("source", source);

  const antes = new Set(((antigos as any[]) ?? []).map((r) => String(r.pacote)));
  const agora = new Set(entries.map((e) => e.pacote));
  const remover = [...antes].filter((p) => !agora.has(p));

  if (remover.length > 0) {
    await supabaseAdmin
      .from("shelf_vetoes" as any)
      .delete()
      .eq("source", source)
      .in("pacote", remover);
  }

  if (entries.length > 0) {
    await supabaseAdmin.from("shelf_vetoes" as any).upsert(
      entries.map((e) => ({
        pacote: e.pacote,
        source,
        motivo: e.motivo.slice(0, 400),
        refreshed_at: new Date().toISOString(),
        expires_at,
      })),
      { onConflict: "pacote,source" },
    );
  }

  return reconcileShelf([...antes, ...agora]);
}

/** Veto pontual (ex.: preflight bloqueou uma cobrança agora). */
export async function addShelfVeto(
  source: ShelfSource,
  pacote: string,
  motivo: string,
  ttlHoras?: number,
): Promise<ShelfReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("shelf_vetoes" as any).upsert(
    {
      pacote,
      source,
      motivo: motivo.slice(0, 400),
      refreshed_at: new Date().toISOString(),
      expires_at: expiraEm(source, ttlHoras),
    },
    { onConflict: "pacote,source" },
  );
  return reconcileShelf([pacote]);
}

export async function clearShelfVeto(source: ShelfSource, pacote: string): Promise<ShelfReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("shelf_vetoes" as any)
    .delete()
    .eq("source", source)
    .eq("pacote", pacote);
  return reconcileShelf([pacote]);
}

/**
 * Traduz vetos em vitrine. Sem pacotes informados, reconcilia o catálogo todo.
 * Roda também como faxina: veto vencido é apagado antes de decidir.
 */
export async function reconcileShelf(pacotes: string[] = []): Promise<ShelfReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const report: ShelfReport = { avaliados: 0, pausados: [], religados: [], errors: 0 };

  await supabaseAdmin
    .from("shelf_vetoes" as any)
    .delete()
    .lt("expires_at", new Date().toISOString());

  let alvos = [...new Set(pacotes)];
  if (alvos.length === 0) {
    const { data } = await supabaseAdmin.from("pricing_items" as any).select("pacote");
    alvos = ((data as any[]) ?? []).map((r) => String(r.pacote));
  }
  if (alvos.length === 0) return report;

  const { data: vetoRows } = await supabaseAdmin
    .from("shelf_vetoes" as any)
    .select("pacote, source, motivo, expires_at")
    .in("pacote", alvos);

  const vetos: ShelfVeto[] = ((vetoRows as any[]) ?? []).map((r) => ({
    pacote: String(r.pacote),
    source: String(r.source),
    motivo: String(r.motivo ?? ""),
    expires_at: String(r.expires_at),
  }));

  const { data: atuaisRows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, is_sellable, sellable_reason")
    .in("pacote", alvos);

  const atuais = new Map(
    ((atuaisRows as any[]) ?? []).map((r) => [
      String(r.pacote),
      { sellable: r.is_sellable !== false, motivo: (r.sellable_reason ?? null) as string | null },
    ]),
  );

  const decisoes = decidirVitrine(alvos, vetos);
  report.avaliados = decisoes.length;

  for (const d of decisoes) {
    const atual = atuais.get(d.pacote);
    if (!atual) continue;
    // v316 — reescrever o MESMO valor não conta como mudança.
    if (atual.sellable === d.sellable && (atual.motivo ?? null) === d.motivo) continue;

    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .update({ is_sellable: d.sellable, sellable_reason: d.motivo })
      .eq("pacote", d.pacote);

    if (error) {
      report.errors += 1;
      console.error("[vitrine] v372 falhou ao aplicar decisão", { pacote: d.pacote, error: error.message });
      continue;
    }
    if (d.sellable) report.religados.push(d.pacote);
    else report.pausados.push(d.pacote);
  }

  if (report.pausados.length > 0 || report.religados.length > 0) {
    console.warn(
      `[vitrine] v372 autoridade: ${report.pausados.length} pausado(s), ${report.religados.length} religado(s)`,
    );
  }
  return report;
}
