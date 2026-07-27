// v299 — "O que precisa da SUA mão"
//
// Por que existe: o sistema tem 27 robôs rodando sozinhos. O risco não é mais
// "o robô não rodou" — é o dono não enxergar as 5 coisas que SÓ ele pode fazer
// (mexer em dinheiro, aprovar pessoa, aprovar conteúdo). Este módulo lê o banco
// e devolve APENAS pendências reais que exigem decisão humana. Zero placeholder:
// se não há pendência, a lista vem vazia.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildTopupUrl } from "@/lib/provider-topup";

export type PendenciaManual = {
  id: string;
  titulo: string;
  detalhe: string;
  urgencia: "alta" | "media" | "baixa";
  /** Link externo (recarga do fornecedor) ou rota interna do admin. */
  href?: string;
  cta?: string;
};

export type PendenciasDigest = {
  pendencias: PendenciaManual[];
  robosAtivos: number;
  geradoEm: string;
};

function toBrl(saldo: number, moeda: string | null, cotacao: number | null): number {
  const c = Number(cotacao);
  if ((moeda ?? "USD").toUpperCase() === "BRL") return saldo;
  return Number.isFinite(c) && c > 0 ? saldo * c : saldo;
}

export async function collectPendencias(): Promise<PendenciasDigest> {
  const out: PendenciaManual[] = [];

  // 1) Dinheiro no fornecedor — só você deposita.
  try {
    const { data } = await supabaseAdmin
      .from("fornecedores")
      .select("nome, api_url, saldo_atual, moeda, cotacao_brl, ativo")
      .eq("ativo", true);
    for (const f of data ?? []) {
      const brl = toBrl(Number((f as any).saldo_atual ?? 0), (f as any).moeda, (f as any).cotacao_brl);
      if (brl >= 30) continue;
      out.push({
        id: `saldo:${(f as any).nome}`,
        titulo: `Recarregar ${(f as any).nome}`,
        detalhe: `Saldo atual: R$ ${brl.toFixed(2)}. Abaixo disso os pedidos começam a cair pro próximo fornecedor.`,
        urgencia: brl < 10 ? "alta" : "media",
        href: buildTopupUrl((f as any).api_url) ?? undefined,
        cta: "Recarregar agora",
      });
    }
  } catch { /* fornecedor indisponível não vira pendência falsa */ }

  // 2) Comissão de afiliado — pagamento Pix é ato humano.
  try {
    const { data } = await supabaseAdmin
      .from("afiliados")
      .select("nome, saldo_brl, pix_chave")
      .gt("saldo_brl", 0);
    const total = (data ?? []).reduce((s, a: any) => s + Number(a.saldo_brl ?? 0), 0);
    if ((data ?? []).length > 0) {
      out.push({
        id: "afiliados:pagar",
        titulo: `Pagar ${data!.length} afiliado(s)`,
        detalhe: `R$ ${total.toFixed(2)} em comissão acumulada aguardando Pix.`,
        urgencia: "media",
        cta: "Abrir painel de afiliados",
      });
    }
  } catch { /* ignore */ }

  // 3) Revendedor novo — aprovar ou recusar é decisão de negócio.
  try {
    const { data } = await supabaseAdmin
      .from("reseller_applications")
      .select("id, nome, status")
      .eq("status", "pendente");
    if ((data ?? []).length > 0) {
      out.push({
        id: "revenda:aprovar",
        titulo: `${data!.length} pedido(s) de revenda aguardando`,
        detalhe: "Cada candidato precisa da sua aprovação antes de receber chave de API.",
        urgencia: "baixa",
        cta: "Abrir painel de revenda",
      });
    }
  } catch { /* ignore */ }

  // 4) Post agendado sem aprovação — conteúdo sai no seu nome.
  try {
    const { data } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, approved, status")
      .eq("approved", false)
      .eq("status", "pending");
    if ((data ?? []).length > 0) {
      out.push({
        id: "copy:aprovar",
        titulo: `${data!.length} post(s) aguardando sua aprovação`,
        detalhe: "Nada é publicado sem você aprovar a copy.",
        urgencia: "baixa",
        cta: "Abrir Copy Studio",
      });
    }
  } catch { /* ignore */ }

  // 5) Alerta crítico ainda aberto — robô já tentou curar e não conseguiu.
  try {
    const { data } = await supabaseAdmin
      .from("alerts")
      .select("id, mensagem, nivel")
      .eq("status", "open")
      .gte("nivel", 3)
      .limit(5);
    for (const a of data ?? []) {
      out.push({
        id: `alerta:${(a as any).id}`,
        titulo: "Alerta crítico sem solução automática",
        detalhe: String((a as any).mensagem ?? "").slice(0, 180),
        urgencia: "alta",
        cta: "Abrir diagnóstico",
      });
    }
  } catch { /* ignore */ }

  let robosAtivos = 0;
  try {
    const { data } = await supabaseAdmin.rpc("vigia_robos" as any);
    const arr = (data as any)?.jobs;
    if (Array.isArray(arr)) robosAtivos = arr.length;
  } catch { /* contagem é informativa */ }

  const ordem = { alta: 0, media: 1, baixa: 2 } as const;
  out.sort((a, b) => ordem[a.urgencia] - ordem[b.urgencia]);

  return { pendencias: out, robosAtivos, geradoEm: new Date().toISOString() };
}
