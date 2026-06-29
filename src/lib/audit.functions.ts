// Auditoria de margem read-only por fornecedor.
// Faz scan assíncrono da API do fornecedor (SMMhype-compatível: action=services),
// junta com serviços que usamos (resolveServiceId/overrides), converte custo
// USD→BRL via cotacao_brl do fornecedor, e calcula lucro com a fórmula High-CAC.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ token: z.string().min(8), fornecedorId: z.string().min(1) });

export type AuditRow = {
  serviceId: number;
  name: string;
  category: string | null;
  status: "ATIVO" | "INATIVO" | "REVISAO";
  costUsdPer1k: number;
  costBrlPer1k: number;
  vendaBrlPer1k: number;
  taxaPix: number;
  lucroBrl: number;
  margemPct: number;
};

export type AuditResp =
  | { ok: true; fornecedor: string; cotacao: number; rows: AuditRow[]; scannedAt: string }
  | { ok: false; error: string };

const COUPON_BUFFER = 0.85;
const PIX_RATE = 0.0099; // 0,99% MP PIX aprox.
function tier(qty: number) { return qty <= 1000 ? 4.5 : qty <= 10000 ? 3.2 : 2.2; }

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
      return { ok: false, error: `Falha API: ${e?.message ?? e}` };
    }

    const rows: AuditRow[] = [];
    for (const s of services) {
      const sid = Number(s.service ?? s.id);
      if (!Number.isFinite(sid) || !USED_IDS.has(sid)) continue;
      const rateUsdPer1k = Number(s.rate ?? 0);
      const costBrl = rateUsdPer1k * cotacao;
      const qtyRef = 1000;
      const raw = (costBrl * tier(qtyRef)) / COUPON_BUFFER;
      const venda = Math.max(3, Math.ceil(raw / 0.5) * 0.5);
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
