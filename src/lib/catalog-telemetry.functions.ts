// v162 — Read-only telemetry dos 3 catálogos (SMMhype/SMMPanel/Verified).
// Zero HTTP externo: lê apenas services_cache + pricing_items + fornecedores.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ token: z.string().min(8) });

function checkToken(token: string) {
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && token === expected;
}

export type ProviderTelemetry = {
  slug: "smmhype" | "smmpainel" | "verified";
  nome: string;
  ativo: boolean;
  saldo_brl: number;
  cotacao_brl: number;
  pacotes_mapeados: number; // pricing_items com service_id preenchido
  catalogo_indexado: number | null; // services_cache (só SMMhype hoje)
  last_sync: string | null;
};

export const getCatalogTelemetry = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: forn }, { data: items }, { data: cache }] = await Promise.all([
      supabaseAdmin.from("fornecedores").select("slug, nome, ativo, saldo_atual, cotacao_brl"),
      supabaseAdmin.from("pricing_items" as any).select("smmhype_service_id, smmpanel_service_id, verified_service_id"),
      supabaseAdmin.from("services_cache").select("provider_service_id, updated_at"),
    ]);

    const fornMap = new Map<string, any>();
    ((forn as any[]) ?? []).forEach((f) => fornMap.set(f.slug, f));

    const mapped = { smmhype: 0, smmpainel: 0, verified: 0 };
    for (const r of ((items as any[]) ?? [])) {
      if (r.smmhype_service_id) mapped.smmhype++;
      if (r.smmpanel_service_id) mapped.smmpainel++;
      if (r.verified_service_id) mapped.verified++;
    }

    const lastSyncSmmhype = ((cache as any[]) ?? []).reduce<string | null>((acc, r) => {
      if (!acc || new Date(r.updated_at) > new Date(acc)) return r.updated_at;
      return acc;
    }, null);

    const build = (slug: "smmhype" | "smmpainel" | "verified", nome: string): ProviderTelemetry => {
      const f = fornMap.get(slug);
      return {
        slug,
        nome,
        ativo: !!f?.ativo,
        saldo_brl: Number(f?.saldo_atual ?? 0),
        cotacao_brl: Number(f?.cotacao_brl ?? 0),
        pacotes_mapeados: mapped[slug],
        catalogo_indexado: slug === "smmhype" ? ((cache as any[])?.length ?? 0) : null,
        last_sync: slug === "smmhype" ? lastSyncSmmhype : null,
      };
    };

    return {
      ok: true as const,
      providers: [
        build("smmhype", "SMMhype"),
        build("smmpainel", "SMMPainel"),
        build("verified", "Verified Atacado"),
      ] as ProviderTelemetry[],
      generated_at: new Date().toISOString(),
    };
  });
