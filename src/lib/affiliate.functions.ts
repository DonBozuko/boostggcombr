// v265 — API pública do Programa de Afiliados (cadastro + painel).
// Cadastro é automático: não há risco financeiro, porque comissão só nasce
// depois de Pix aprovado e o saque é liberado manualmente no admin.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";

const signupSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  whatsapp: z.string().trim().min(8).max(25),
  pix_chave: z.string().trim().max(120).optional().or(z.literal("")),
});

export type AffiliateSignupResult =
  | { ok: true; codigo: string; link: string; comissaoPct: number; existente: boolean }
  | { ok: false; error: string };

const SITE = "https://www.boostgg.com.br";

export const signupAffiliate = createServerFn({ method: "POST" })
  .inputValidator((i) => signupSchema.parse(i))
  .handler(async ({ data }): Promise<AffiliateSignupResult> => {
    const req = getRequest();
    const { clientIpFrom, checkRateLimit } = await import("@/lib/rate-limit.server");
    const ip = req?.headers ? clientIpFrom(req.headers) : "unknown";
    const rl = await checkRateLimit("affiliate-signup", ip, 5, 3600);
    if (!rl.allowed) return { ok: false, error: "Muitas tentativas. Tente mais tarde." };

    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateAffiliateCode, AFFILIATE_DEFAULT_PCT } = await import("@/lib/affiliate.server");

    const { data: existing } = await supabaseAdmin
      .from("afiliados" as any)
      .select("codigo, comissao_pct, ativo")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      const e = existing as any;
      if (e.ativo !== true) return { ok: false, error: "Este cadastro está suspenso. Fale com o suporte." };
      return {
        ok: true,
        codigo: String(e.codigo),
        link: `${SITE}/?ref=${e.codigo}`,
        comissaoPct: Number(e.comissao_pct ?? AFFILIATE_DEFAULT_PCT),
        existente: true,
      };
    }

    let codigo = "";
    for (let i = 0; i < 5 && !codigo; i++) {
      const tent = generateAffiliateCode(data.nome);
      const { data: hit } = await supabaseAdmin
        .from("afiliados" as any)
        .select("id")
        .eq("codigo", tent)
        .maybeSingle();
      if (!hit) codigo = tent;
    }
    if (!codigo) return { ok: false, error: "Não consegui gerar seu código agora. Tente de novo." };

    const { error } = await supabaseAdmin.from("afiliados" as any).insert({
      nome: data.nome,
      email,
      whatsapp: data.whatsapp,
      pix_chave: data.pix_chave || null,
      codigo,
      comissao_pct: AFFILIATE_DEFAULT_PCT,
    } as any);
    if (error) {
      console.error("[afiliados] insert falhou:", error.message);
      return { ok: false, error: "Não consegui criar seu cadastro agora." };
    }

    try {
      const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
      await dispatchWhatsappAlert(
        `🤝 NOVO AFILIADO CADASTRADO\n\nPROBLEMA: nenhum — é gente nova vendendo pra você.\nNome: ${data.nome}\nWhatsApp: ${data.whatsapp}\nCódigo: ${codigo}\n\nO QUE FAZER: nada agora. A comissão só é creditada quando o Pix do cliente indicado for aprovado.`,
      );
    } catch { /* best-effort */ }

    return { ok: true, codigo, link: `${SITE}/?ref=${codigo}`, comissaoPct: AFFILIATE_DEFAULT_PCT, existente: false };
  });

export type AffiliateDashboard =
  | {
      ok: true;
      nome: string;
      codigo: string;
      link: string;
      comissaoPct: number;
      saldo: number;
      totalGanho: number;
      pago: number;
      comissoes: { data: string; valorPedido: number; comissao: number; status: string }[];
    }
  | { ok: false; error: string };

const loginSchema = z.object({
  codigo: z.string().trim().min(4).max(16),
  email: z.string().trim().email().max(160),
});

export const affiliateDashboard = createServerFn({ method: "POST" })
  .inputValidator((i) => loginSchema.parse(i))
  .handler(async ({ data }): Promise<AffiliateDashboard> => {
    const req = getRequest();
    const { clientIpFrom, checkRateLimit } = await import("@/lib/rate-limit.server");
    const ip = req?.headers ? clientIpFrom(req.headers) : "unknown";
    const rl = await checkRateLimit("affiliate-login", ip, 20, 900);
    if (!rl.allowed) return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };

    const codigo = data.codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("afiliados" as any)
      .select("id, nome, codigo, comissao_pct, saldo_brl, total_ganho, pago_brl, ativo")
      .eq("codigo", codigo)
      .eq("email", email)
      .maybeSingle();
    const a = row as any;
    if (!a || a.ativo !== true) return { ok: false, error: "Código ou e-mail não conferem." };

    const { data: com } = await supabaseAdmin
      .from("afiliado_comissoes" as any)
      .select("created_at, valor_pedido, comissao_brl, status")
      .eq("afiliado_id", a.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return {
      ok: true,
      nome: String(a.nome),
      codigo: String(a.codigo),
      link: `${SITE}/?ref=${a.codigo}`,
      comissaoPct: Number(a.comissao_pct ?? 0.1),
      saldo: Number(a.saldo_brl ?? 0),
      totalGanho: Number(a.total_ganho ?? 0),
      pago: Number(a.pago_brl ?? 0),
      comissoes: ((com ?? []) as any[]).map((c) => ({
        data: String(c.created_at),
        valorPedido: Number(c.valor_pedido),
        comissao: Number(c.comissao_brl),
        status: String(c.status),
      })),
    };
  });
