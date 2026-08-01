// v262 — Solicitação pública de acesso ao programa de revenda.
// Fluxo: lead preenche em /revenda → grava em reseller_applications (service_role,
// RLS fecha leitura pública) → alerta no WhatsApp do dono → aprovação manual no admin.
// Aprovação manual é DE PROPÓSITO: cadastro aberto sem triagem canibaliza o varejo
// e abre porta pra fraude/chargeback.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";

const applySchema = z.object({
  nome: z.string().trim().min(2).max(80),
  whatsapp: z.string().trim().min(8).max(25),
  email: z.string().trim().email().max(160),
  volume_mes: z.string().trim().max(40).optional().or(z.literal("")),
  canal: z.string().trim().max(60).optional().or(z.literal("")),
  mensagem: z.string().trim().max(600).optional().or(z.literal("")),
});

export const submitResellerApplication = createServerFn({ method: "POST" })
  .inputValidator((i) => applySchema.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const req = getRequest();
    const { clientIpFrom, checkRateLimit } = await import("@/lib/rate-limit.server");
    const ip = req?.headers ? clientIpFrom(req.headers) : "unknown";
    const rl = await checkRateLimit("reseller-apply", ip, 5, 3600);
    if (!rl.allowed) {
      return { ok: false, error: "Muitas solicitações. Tente novamente mais tarde." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reseller_applications" as any).insert({
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email.toLowerCase(),
      volume_mes: data.volume_mes || null,
      canal: data.canal || null,
      mensagem: data.mensagem || null,
      client_ip: ip,
    } as any);
    if (error) {
      console.error("[reseller-apply] insert falhou:", error.message);
      return { ok: false, error: "Não consegui registrar agora. Chame no WhatsApp." };
    }

    try {
      const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
      await dispatchWhatsappAlert(
        `🤝 NOVO PEDIDO DE REVENDA\n` +
          `\nPROBLEMA: nenhum — é oportunidade de venda.` +
          `\nNome: ${data.nome}` +
          `\nWhatsApp: ${data.whatsapp}` +
          (data.volume_mes ? `\nVolume/mês: ${data.volume_mes}` : "") +
          (data.canal ? `\nVende em: ${data.canal}` : "") +
          `\nE-mail: ${data.email}` +
          `\n\nO QUE FAZER: abre o admin → Revendedores → "Pedidos de revenda" e clica em "Aprovar e liberar". O sistema cria o acesso e manda a chave por e-mail sozinho. Você não precisa responder no WhatsApp.`,
      );
    } catch {
      /* alerta é best-effort; o lead já está salvo */
    }

    return { ok: true };
  });

export type ResellerApplication = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  volume_mes: string | null;
  canal: string | null;
  mensagem: string | null;
  status: string;
  created_at: string;
};

const tokenOnly = z.object({ token: z.string().min(8) });

export const listResellerApplications = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; rows: ResellerApplication[] }> => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED", rows: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("reseller_applications" as any)
      .select("id, nome, whatsapp, email, volume_mes, canal, mensagem, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { ok: false, error: error.message, rows: [] };
    return { ok: true, rows: (rows ?? []) as unknown as ResellerApplication[] };
  });

export const setResellerApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        token: z.string().min(8),
        id: z.string().uuid(),
        status: z.enum(["novo", "em_contato", "aprovado", "recusado"]),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("reseller_applications" as any)
      .update({ status: data.status } as any)
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// v264 — Aprovação com liberação automática de acesso.
// Um clique: cria o revendedor, gera a chave e envia por e-mail. Sem WhatsApp na mão.
export const approveAndProvisionReseller = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        token: z.string().min(8),
        id: z.string().uuid(),
        desconto_pct: z.number().min(0).max(0.3).default(0.1),
      })
      .parse(i),
  )
  .handler(
    async ({ data }): Promise<{ ok: boolean; error?: string; apiKey?: string; emailed?: boolean }> => {
      if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: app } = await supabaseAdmin
        .from("reseller_applications" as any)
        .select("id, nome, email")
        .eq("id", data.id)
        .maybeSingle();
      const a = app as any;
      if (!a) return { ok: false, error: "Solicitação não encontrada." };
      if (!a.email) return { ok: false, error: "Essa solicitação não tem e-mail. Peça o e-mail antes de liberar." };

      const { provisionReseller } = await import("@/lib/reseller-provision.server");
      const res = await provisionReseller({
        nome: String(a.nome),
        email: String(a.email),
        descontoPct: data.desconto_pct,
      });
      if (!res.ok) return { ok: false, error: res.error };

      await supabaseAdmin
        .from("reseller_applications" as any)
        .update({ status: "aprovado" } as any)
        .eq("id", data.id);

      return { ok: true, apiKey: res.apiKey, emailed: res.emailed };
    },
  );

// v264 — "Esqueci minha chave": reemite e invalida a antiga. Resposta sempre
// genérica para não revelar quem é revendedor.
export const forgotResellerKey = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ email: z.string().trim().email().max(160) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const req = getRequest();
    const { clientIpFrom, checkRateLimit } = await import("@/lib/rate-limit.server");
    const ip = req?.headers ? clientIpFrom(req.headers) : "unknown";
    const rl = await checkRateLimit("reseller-forgot-key", ip, 5, 3600);
    if (!rl.allowed) {
      return { ok: false, message: "Muitas tentativas. Tente novamente mais tarde." };
    }
    const { reissueResellerKey } = await import("@/lib/reseller-provision.server");
    await reissueResellerKey(data.email);
    return {
      ok: true,
      message: "Se esse e-mail estiver cadastrado como revendedor, a nova chave chega em instantes.",
    };
  });
