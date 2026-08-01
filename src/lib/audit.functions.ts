// Auditoria de margem read-only por fornecedor.
// Faz scan assíncrono da API do fornecedor (SMMhype-compatível: action=services),
// junta com serviços que usamos (resolveServiceId/overrides), converte custo
// USD→BRL via cotacao_brl do fornecedor, e calcula lucro com a fórmula High-CAC.
import { createServerFn } from "@tanstack/react-start";
import { computeGuardedPrice } from "@/lib/margin-guardian";
import { z } from "zod";

const input = z.object({ token: z.string().min(8), fornecedorId: z.string().min(1) });
const tokenOnlyInput = z.object({ token: z.string().min(8) });

import type { AuditRow } from "@/lib/audit-contingency.server";
export type { AuditRow };

export type AuditResp =
  | { ok: true; fornecedor: string; cotacao: number; rows: AuditRow[]; scannedAt: string }
  | { ok: false; error: string };

// v307 — a auditoria de fornecedor NÃO tem fórmula própria. Ela simula o preço
// exatamente como a Autoridade Única faria, senão o painel mostra margem que
// não existe na vitrine.


// IDs que efetivamente usamos no dispatcher (mantém alinhado com smmhype.server.ts)
const USED_IDS = new Set<number>([
  14325, 14225, 18860, 18855, 14330, 19191, 14907,
  19440, 14321, 18870, 7593, 9313, 10351, 19106, 19107,
]);

export const auditarFornecedor = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }): Promise<AuditResp> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: f } = await supabaseAdmin
      .from("fornecedores")
      .select("id, nome, slug, api_url, cotacao_brl, ativo, status")
      .eq("id", data.fornecedorId)
      .maybeSingle();
    if (!f) return { ok: false, error: "FORNECEDOR_NAO_ENCONTRADO" };

    // Chave por fornecedor (slug → env)
    const slug = String((f as any).slug ?? "").toLowerCase();
    const keyMap: Record<string, string | undefined> = {
      smmhype: process.env.SMMHYPE_API_KEY,
      smmpainel: process.env.SMMPAINEL_API_KEY,
      verified: process.env.VERIFIED_API_KEY,
    };
    const apiKey = keyMap[slug];
    const apiUrl = String((f as any).api_url ?? "https://smmhype.com/api/v2");
    const cotacao = Number((f as any).cotacao_brl ?? 7.0);

    if (!apiKey) {
      return { ok: false, error: `API key ausente para ${(f as any).nome}` };
    }

    // Chamada services (SMMhype-compatível, comum em painéis SMM)
    let services: any[] = [];
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12_000);
      const body = new URLSearchParams({ key: apiKey, action: "services" });
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));
      const txt = await r.text();
      const j = JSON.parse(txt);
      services = Array.isArray(j) ? j : [];
    } catch (e: any) {
      const rows = await (await import("@/lib/audit-contingency.server")).buildContingencyAuditRows();
      return { ok: true, fornecedor: `${(f as any).nome} · CONTINGÊNCIA LOCAL`, cotacao, rows, scannedAt: new Date().toISOString() };
    }

    const { PIX_RATE } = await import("@/lib/audit-contingency.server");
    const rows: AuditRow[] = [];
    for (const s of services) {
      const sid = Number(s.service ?? s.id);
      if (!Number.isFinite(sid) || !USED_IDS.has(sid)) continue;
      const rateUsdPer1k = Number(s.rate ?? 0);
      const costBrl = rateUsdPer1k * cotacao;
      const qtyRef = 1000;
      const venda = computeGuardedPrice(costBrl, qtyRef);
      const pix = venda * PIX_RATE;
      const lucro = venda - costBrl - pix;
      const margem = venda > 0 ? (lucro / venda) * 100 : 0;
      const status: AuditRow["status"] =
        rateUsdPer1k <= 0 ? "REVISAO" :
        margem < 30 ? "REVISAO" :
        (f as any).ativo ? "ATIVO" : "INATIVO";
      rows.push({
        serviceId: sid,
        name: String(s.name ?? `Service ${sid}`),
        category: s.category ?? null,
        status,
        costUsdPer1k: rateUsdPer1k,
        costBrlPer1k: costBrl,
        vendaBrlPer1k: venda,
        taxaPix: pix,
        lucroBrl: lucro,
        margemPct: margem,
      });
    }

    rows.sort((a, b) => a.serviceId - b.serviceId);
    return { ok: true, fornecedor: (f as any).nome, cotacao, rows, scannedAt: new Date().toISOString() };
  });

export const auditoriaContingenciaLocal = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnlyInput.parse(i))
  .handler(async ({ data }): Promise<AuditResp> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const rows = await (await import("@/lib/audit-contingency.server")).buildContingencyAuditRows();
    return {
      ok: true,
      fornecedor: "MATRIZ LOCAL DE CONTINGÊNCIA v50-Patch",
      cotacao: 7.0,
      rows,
      scannedAt: new Date().toISOString(),
    };
  });
