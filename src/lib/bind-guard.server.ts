// v320 — PORTÃO ÚNICO DE VÍNCULO.
//
// Causa raiz do loop infinito de alertas "pacote vinculado ao produto errado":
// existiam DUAS fontes de verdade para o ID do serviço.
//   1) o catálogo VIVO do fornecedor (services_cache & irmãs) — verdade real;
//   2) constantes chumbadas no código (ex.: VIEWS_SERVICE_ID = 18855) — foto
//      antiga, tirada no dia em que alguém conferiu na mão.
// O fornecedor reaproveita número: o 18855 já foi "Instagram Views" e hoje é
// "Instagram Likes". A auditoria desvinculava o errado, e no ciclo seguinte o
// motor de preço regravava a constante chumbada. Desvincula → religa → alerta.
// Para sempre. Nenhuma trava adiante do banco resolve isso, porque o vínculo
// ruim nascia ANTES: na hora da escrita.
//
// Este módulo é o único portão: nada entra em pricing_items sem que o NOME REAL
// do serviço no fornecedor combine com a intenção do pacote. ID que não passa
// vira NULL — o pacote cai para outro fornecedor em vez de entregar produto
// errado ao cliente.
import { serviceMatchesIntent } from "@/lib/catalog-coherence";

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

export type ServiceNameMap = Map<string, string>;

const key = (provider: string, id: string | number) => `${provider}:${String(id).trim()}`;

/**
 * Carrega o nome real de cada serviço em cada fornecedor.
 * Paginado: o cache do fornecedor principal passa de 6.000 linhas e a API corta
 * em 1.000 — ler só a primeira página deixaria o portão cego e ele rejeitaria
 * vínculo bom (pior que não ter portão).
 */
export async function loadServiceNames(): Promise<ServiceNameMap> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const names: ServiceNameMap = new Map();
  const PAGE = 1000;
  await Promise.all(
    CACHE_TABLES.map(async ({ table, provider }) => {
      try {
        for (let from = 0; ; from += PAGE) {
          const { data } = await supabaseAdmin
            .from(table as any)
            .select("provider_service_id, name")
            .range(from, from + PAGE - 1);
          const page = (data as any[]) ?? [];
          for (const s of page) {
            const id = String(s.provider_service_id ?? "").trim();
            if (id && s.name) names.set(key(provider, id), String(s.name));
          }
          if (page.length < PAGE) break;
        }
      } catch (e) {
        console.warn(`[bind-guard] falha lendo ${table}:`, e);
      }
    }),
  );
  return names;
}

export type BindRejection = { pacote: string; col: string; id: string; nome: string };

/**
 * Zera todo ID cujo nome real no fornecedor contraria a intenção do pacote.
 * Silêncio deliberado quando o nome é desconhecido: cache atrasado não pode
 * apagar vínculo bom. Só corta quando há prova positiva de incompatibilidade.
 */
export function sanitizeBindings<T extends Record<string, any>>(
  rows: T[],
  names: ServiceNameMap,
): { rows: T[]; rejected: BindRejection[] } {
  const rejected: BindRejection[] = [];
  const out = rows.map((row) => {
    const category = row.category ?? null;
    if (!category) return row;
    let patched: T | null = null;
    for (const { col, provider } of ID_COLUMNS) {
      const raw = row[col];
      if (raw === null || raw === undefined || String(raw).trim() === "") continue;
      const id = String(raw).trim();
      const nome = names.get(key(provider, id));
      if (!nome) continue; // desconhecido ≠ errado
      if (serviceMatchesIntent(category, nome)) continue;
      patched = patched ?? ({ ...row } as T);
      (patched as any)[col] = null;
      rejected.push({ pacote: String(row.pacote ?? "?"), col, id, nome });
    }
    return patched ?? row;
  });
  return { rows: out, rejected };
}

/** Atalho para quem já tem as linhas prontas e não carregou os nomes ainda. */
export async function guardBindings<T extends Record<string, any>>(
  rows: T[],
): Promise<{ rows: T[]; rejected: BindRejection[] }> {
  const names = await loadServiceNames();
  const res = sanitizeBindings(rows, names);
  if (res.rejected.length > 0) {
    const amostra = res.rejected
      .slice(0, 5)
      .map((r) => `${r.pacote}.${r.col}=${r.id} ("${r.nome.slice(0, 40)}")`)
      .join(" | ");
    console.warn(
      `[bind-guard] v320 barrou ${res.rejected.length} vínculo(s) incompatível(is): ${amostra}`,
    );
  }
  return res;
}
