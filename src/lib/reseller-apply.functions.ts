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
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
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
      email: data.email || null,
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
          `\n\nO QUE FAZER: chama essa pessoa no WhatsApp. Se fechar, abre o admin → Tesouraria → Revendedores, cria o acesso e credita o saldo depois que o Pix dela cair.`,
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
function auth(token: string): boolean {
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export const listResellerApplications = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; rows: ResellerApplication[] }> => {
    if (!auth(data.token)) return { ok: false, error: "UNAUTHORIZED", rows: [] };
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
    if (!auth(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("reseller_applications" as any)
      .update({ status: data.status } as any)
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
