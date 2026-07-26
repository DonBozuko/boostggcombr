// v263 — Portal do revendedor (login por chave de API + recarga Pix automática).
//
// Decisões deliberadas:
//  - Sem senha/e-mail novo: a chave de API JÁ é o segredo dele. Criar um segundo
//    sistema de auth só multiplicaria superfície de ataque e suporte.
//  - Recarga cria pagamento Pix no MP com external_reference "reseller-topup:<id>".
//    Quem credita o saldo é o webhook (fonte da verdade = MP aprovou), nunca o front.
//  - Crédito é idempotente: o webhook só credita se a recarga ainda estiver 'pending'.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";

const keySchema = z.object({ apiKey: z.string().trim().min(8).max(80) });

async function ip(): Promise<string> {
  try {
    const req = getRequest();
    const { clientIpFrom } = await import("@/lib/rate-limit.server");
    return req?.headers ? clientIpFrom(req.headers) : "unknown";
  } catch {
    return "unknown";
  }
}

async function limited(bucket: string, max: number, windowSec: number): Promise<boolean> {
  try {
    const { checkRateLimit } = await import("@/lib/rate-limit.server");
    const rl = await checkRateLimit(bucket, await ip(), max, windowSec);
    return !rl.allowed;
  } catch {
    return false; // fail-open, igual ao resto do sistema
  }
}

export type PortalLedgerRow = {
  created_at: string;
  tipo: string;
  valor: number;
  saldo_depois: number;
  detalhe: string;
};

export type PortalOrderRow = {
  id: string;
  pacote: string;
  quantidade: number;
  valor: number;
  status: string;
  created_at: string;
};

export type PortalData = {
  ok: boolean;
  error?: string;
  nome?: string;
  saldo?: number;
  desconto_pct?: number;
  ledger?: PortalLedgerRow[];
  pedidos?: PortalOrderRow[];
};

/** Login + dados do painel. A chave nunca sai do navegador dele para outro lugar. */
export const resellerMe = createServerFn({ method: "POST" })
  .inputValidator((i) => keySchema.parse(i))
  .handler(async ({ data }): Promise<PortalData> => {
    if (await limited("reseller-portal", 60, 300)) {
      return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    const { authReseller } = await import("@/lib/reseller-api.server");
    const r = await authReseller(data.apiKey);
    if (!r) return { ok: false, error: "Chave inválida ou acesso desativado." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: led }, { data: peds }] = await Promise.all([
      supabaseAdmin
        .from("reseller_ledger" as any)
        .select("created_at, tipo, valor_brl, saldo_depois, detalhe")
        .eq("reseller_id", r.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("pedidos")
        .select("id, pacote, quantidade, reseller_valor, status, created_at")
        .eq("reseller_id", r.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return {
      ok: true,
      nome: r.nome,
      saldo: Number(r.saldo_brl.toFixed(2)),
      desconto_pct: r.desconto_pct,
      ledger: ((led ?? []) as any[]).map((x) => ({
        created_at: String(x.created_at),
        tipo: String(x.tipo),
        valor: Number(x.valor_brl),
        saldo_depois: Number(x.saldo_depois),
        detalhe: String(x.detalhe ?? ""),
      })),
      pedidos: ((peds ?? []) as any[]).map((x) => ({
        id: String(x.id),
        pacote: String(x.pacote),
        quantidade: Number(x.quantidade),
        valor: Number(x.reseller_valor ?? 0),
        status: String(x.status),
        created_at: String(x.created_at),
      })),
    };
  });

export type TopupResult = {
  ok: boolean;
  error?: string;
  topupId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  valor?: number;
};

/** Gera o Pix de recarga. O saldo só entra quando o MP confirmar (webhook). */
export const resellerTopup = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ apiKey: z.string().trim().min(8).max(80), valor: z.number().min(20).max(20000) }).parse(i),
  )
  .handler(async ({ data }): Promise<TopupResult> => {
    if (await limited("reseller-topup", 10, 600)) {
      return { ok: false, error: "Muitas recargas seguidas. Aguarde alguns minutos." };
    }
    const { authReseller } = await import("@/lib/reseller-api.server");
    const r = await authReseller(data.apiKey);
    if (!r) return { ok: false, error: "Chave inválida ou acesso desativado." };

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpToken) return { ok: false, error: "Pagamento indisponível agora. Chame no WhatsApp." };

    const valor = Number(data.valor.toFixed(2));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: topup, error: insErr } = await supabaseAdmin
      .from("reseller_topups" as any)
      .insert({ reseller_id: r.id, valor_brl: valor, status: "pending" } as any)
      .select("id")
      .single();
    if (insErr || !topup) {
      console.error("[reseller-topup] insert falhou", insErr);
      return { ok: false, error: "Não consegui gerar o Pix agora. Tente de novo." };
    }
    const topupId = String((topup as any).id);

    try {
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpToken}`,
          "X-Idempotency-Key": `reseller-topup-${topupId}`,
        },
        body: JSON.stringify({
          transaction_amount: valor,
          description: `BoostGG - recarga de saldo revenda (${r.nome})`,
          payment_method_id: "pix",
          payer: { email: r.email },
          external_reference: `reseller-topup:${topupId}`,
          notification_url: "https://boostgg.com.br/api/public/mp-webhook",
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const mp = (await mpRes.json().catch(() => ({}))) as {
        id?: string | number;
        point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
      };
      const qrCode = mp.point_of_interaction?.transaction_data?.qr_code ?? "";
      const qrCodeBase64 = mp.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";
      if (!mpRes.ok || !mp.id || !qrCode) {
        console.error("[reseller-topup] MP falhou", mpRes.status, mp);
        await supabaseAdmin
          .from("reseller_topups" as any)
          .update({ status: "failed" } as any)
          .eq("id", topupId);
        return { ok: false, error: "O Pix não foi gerado. Tente novamente em instantes." };
      }
      await supabaseAdmin
        .from("reseller_topups" as any)
        .update({ mercado_pago_id: String(mp.id) } as any)
        .eq("id", topupId);
      return { ok: true, topupId, qrCode, qrCodeBase64, valor };
    } catch (e) {
      console.error("[reseller-topup] exceção", e);
      // v278 — sem isto a linha ficava 'pending' pra sempre (recarga fantasma
      // no painel do revendedor). Se o Pix não nasceu, a recarga morre aqui.
      await supabaseAdmin
        .from("reseller_topups" as any)
        .update({ status: "failed" } as any)
        .eq("id", topupId)
        .eq("status", "pending");
      return { ok: false, error: "Falha de rede ao gerar o Pix. Tente de novo." };
    }
  });

/** Polling do front: a recarga já caiu? */
export const resellerTopupStatus = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ apiKey: z.string().trim().min(8).max(80), topupId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; status?: string; saldo?: number; error?: string }> => {
    const { authReseller } = await import("@/lib/reseller-api.server");
    const r = await authReseller(data.apiKey);
    if (!r) return { ok: false, error: "Chave inválida." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("reseller_topups" as any)
      .select("status")
      .eq("id", data.topupId)
      .eq("reseller_id", r.id)
      .maybeSingle();
    if (!row) return { ok: false, error: "Recarga não encontrada." };
    return { ok: true, status: String((row as any).status), saldo: Number(r.saldo_brl.toFixed(2)) };
  });

export type PortalService = {
  service: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  retail: number;
  refill: boolean;
};

/** Catálogo com o preço dele (mesma cotação da API pública). */
export const resellerCatalog = createServerFn({ method: "POST" })
  .inputValidator((i) => keySchema.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; services: PortalService[] }> => {
    const { authReseller } = await import("@/lib/reseller-api.server");
    const r = await authReseller(data.apiKey);
    if (!r) return { ok: false, error: "Chave inválida.", services: [] };
    const { quoteReseller } = await import("@/lib/reseller-pricing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, category, quantidade, price_brl, cost_brl, is_sellable, refill_supported")
      .order("category")
      .order("quantidade");
    const services = ((rows ?? []) as any[])
      .filter((x) => x.is_sellable !== false && Number(x.price_brl) > 0 && Number(x.quantidade) > 0)
      .map((x) => {
        const q = quoteReseller({
          catalogPrice: Number(x.price_brl),
          costBrl: Number(x.cost_brl),
          descontoPct: r.desconto_pct,
        });
        return {
          service: String(x.pacote),
          name: `${Number(x.quantidade).toLocaleString("pt-BR")} ${String(x.category ?? "").replace(/:/g, " ")}`,
          category: String(x.category ?? ""),
          quantity: Number(x.quantidade),
          price: q.price,
          retail: q.retail,
          refill: x.refill_supported === true,
        };
      });
    return { ok: true, services };
  });

/** Pedido feito pelo painel — passa exatamente pela mesma API/travas da revenda. */
export const resellerPlaceOrder = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        apiKey: z.string().trim().min(8).max(80),
        service: z.string().trim().min(1).max(30),
        link: z.string().trim().min(2).max(200),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; order?: string; balance?: string }> => {
    const { handleResellerApi } = await import("@/lib/reseller-api.server");
    const res = await handleResellerApi(
      new Request("https://boostgg.com.br/api/public/reseller/v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: data.apiKey, action: "add", service: data.service, link: data.link }),
      }),
    );
    const body = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !body?.ok) return { ok: false, error: String(body?.error ?? "Falhou") };
    return { ok: true, order: String(body.order), balance: String(body.balance) };
  });
