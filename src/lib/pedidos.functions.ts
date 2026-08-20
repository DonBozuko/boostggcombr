import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminToken } from "./admin-token-store";

const clean = (s: string) => (s || "").trim().replace(/^@/, "");

/**
 * v588 — PRE-WARMING DE TOKEN (supressão de latência).
 * O token do Mercado Pago expira em 24h. Em vez de cada checkout arriscar 
 * um fetch de 1.5s na API do MP, mantemos o token no banco (tabela app_config).
 * O checkout lê do banco (ms); o cron atualiza a cada 12h.
 */
export const prewarmPedido = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ email: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { getMpAccessToken } = await import("./mp-token.server");
      const token = await getMpAccessToken();
      return { ok: true, token: !!token };
    } catch (err) {
      console.error("[prewarmPedido] falha silenciosa no pre-warming:", err);
      return { ok: false };
    }
  });

export const criarPedido = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        pacote: z.string(),
        quantidade: z.number(),
        valor: z.number().or(z.string()),
        instagram_user: z.string(),
        cupom: z.string().optional(),
        rede_social: z.string().optional(),
        bump_upgrade: z.boolean().optional(),
        // v649 — FASE 1: contrato de pagamento obrigatório e estrito.
        // O backend agora exige explicitamente "pix" ou "cartao" sem defaults.
        metodo: z.enum(["pix", "cartao"]),
        email: z.string().optional(),
        whatsapp_contato: z.string().optional(),
        utm_source: z.string().nullish(),
        utm_medium: z.string().nullish(),
        utm_campaign: z.string().nullish(),
        utm_content: z.string().nullish(),
        utm_term: z.string().nullish(),
      })
      .parse(d),
  )

  .handler(async ({ data }) => {
    const pkg = data.pacote;
    const isBrVariant = pkg.startsWith("br-");
    const pacoteRaw = isBrVariant ? pkg.replace("br-", "") : pkg;

    const isInstagram = !data.rede_social || data.rede_social === "instagram";
    const isTiktok = data.rede_social === "tiktok" || pkg.startsWith("tf") || pkg.startsWith("tl") || pkg.startsWith("tv");
    const isYoutube = data.rede_social === "youtube" || pkg.startsWith("ys") || pkg.startsWith("yv");
    const isFacebook = data.rede_social === "facebook" || pkg.startsWith("ff") || pkg.startsWith("fl");
    const isTelegram = data.rede_social === "telegram" || pkg.startsWith("tgc") || pkg.startsWith("tgg");
    const isTrafego = data.rede_social === "trafego" || pkg.startsWith("wgl") || pkg.startsWith("wbr");
    const isKwai = data.rede_social === "kwai" || pkg.startsWith("kf") || pkg.startsWith("kl") || pkg.startsWith("kv");

    const rede =
      data.rede_social ??
      (isTelegram ? "telegram"
        : isTrafego ? "trafego"
        : isFacebook ? "facebook"
        : isYoutube ? "youtube"
        : isTiktok ? "tiktok"
        : isKwai ? "kwai"
        : "instagram");
    const categoria =
      isTelegram ? "membros"
        : isTrafego ? (pkg.startsWith("wbr") ? "trafego_br" : "trafego_global")
        : isFacebook
        ? (pkg.startsWith("fl") ? "curtidas" : "seguidores")
        : isYoutube
        ? (pkg.startsWith("yv") ? "visualizacoes" : "inscritos")
        : isTiktok
        ? (pkg.startsWith("tl") ? "curtidas" : pkg.startsWith("tv") ? "visualizacoes" : "seguidores")
        : isKwai
        ? (pkg.startsWith("kl") ? "curtidas" : pkg.startsWith("kv") ? "visualizacoes" : "seguidores")
        : (pkg.startsWith("l") ? "curtidas" : pkg.startsWith("v") ? "visualizacoes" : "seguidores");

    const { resolveCheckoutPricing, precoAceito } = await import("./checkout-pricing.server");

    const gridPromise = (async () => {
      try {
        const { getPricingGridImpl, categoryFromPacote } = await import("./pricing-engine.server");
        const cat = categoryFromPacote(pkg);
        if (!cat) return null;
        return await getPricingGridImpl(cat);
      } catch (err) {
        console.warn("[criarPedido] grade indisponível (order bump desativado):", err);
        return null;
      }
    })();

    const [pricing, gridRef] = await Promise.all([resolveCheckoutPricing(pacoteRaw), gridPromise]);

    if (!pricing.ok) {
      console.error("[criarPedido] v590 preço bloqueado:", pacoteRaw, pricing.error, pricing.motivo);
      try {
        const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
        const titulo =
          pricing.error === "PRICE_UNAVAILABLE"
            ? "🛑 CHECKOUT SEM PREÇO OFICIAL"
            : "🛑 PACOTE BLOQUEADO ANTES DE COBRAR";
        await dispatchWhatsappAlert(
          `${titulo}\n\nPROBLEMA: cliente tentou "${data.pacote}" (${data.quantidade} ${categoria} ${rede}). Motivo: ${pricing.motivo}. Não cobrei nada.\n\nO QUE FAZER: abrir Admin › Saúde do Catálogo e conferir esse pacote (preço, custo e fornecedor vinculado).`,
        ).catch(() => {});
      } catch { /* noop */ }
      return { ok: false as const, error: pricing.error };
    }

    let valorBase: number = pricing.valor;
    const qtdOficial: number = pricing.quantidade;

    if (qtdOficial !== data.quantidade) {
      console.error("[criarPedido] quantidade divergente:", data.pacote, data.quantidade, qtdOficial);
      return { ok: false as const, error: "INVALID_PACKAGE" as const };
    }

    valorBase = precoAceito(valorBase, Number(data.valor));

    let pacoteEfetivo = isBrVariant ? `br-${pkg}` : data.pacote;
    let quantidadeEfetiva = qtdOficial;
    let bumpAplicado = false;
    let bumpOfertado = false;
    if (gridRef) {
      const candidates = gridRef.items
        .filter((i) => i.quantidade > qtdOficial)
        .sort((a, b) => a.quantidade - b.quantidade);
      const baseRef = valorBase!;
      const next = candidates.find((i) => i.valor * 0.80 >= baseRef * 1.15);
      bumpOfertado = !!next;
      if (data.bump_upgrade && next) {
        pacoteEfetivo = isBrVariant ? `br-${next.id}` : next.id;
        quantidadeEfetiva = next.quantidade;
        valorBase = Number((next.valor * 0.80).toFixed(2));
        bumpAplicado = true;
      }
    }

    const cupom = (data.cupom ?? "").trim().toUpperCase();
    const hasPrime = cupom.split(/[,\s]+/).includes("PRIME15");
    const discount = hasPrime && valorBase >= 30 ? 0.15 : 0;
    const valorCobrar = Number((valorBase * (1 - discount)).toFixed(2));

    const PREFLIGHT_STRICT_BRL = 50;
    
    // v606 — Retry Atômico: Tenta preflight até 2 vezes em caso de timeout/rede
    const executePreflight = async (retryCount = 0): Promise<{ ok: boolean; error?: string; reason?: string }> => {
      try {
        const preflights = Promise.all([
          import("./route-preflight.server").then(m => m.preflightRouteOrBlock({
            pacote: pacoteEfetivo,
            quantidade: quantidadeEfetiva,
            valorBrl: valorCobrar,
          })),
          import("./target-preflight.server").then(m => m.preflightTargetOrBlock({
            rede: data.rede_social ?? "instagram",
            pacote: pacoteEfetivo,
            alvo: data.instagram_user,
          })),
        ]);
        
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("PREFLIGHT_TIMEOUT")), valorCobrar >= PREFLIGHT_STRICT_BRL ? 12000 : 6000);
        });

        const [preflightRoute, preflightTarget] = await Promise.race([preflights, timeout])
          .finally(() => { if (timeoutId) clearTimeout(timeoutId); });

        if (!preflightRoute.ok) return { ok: false, error: "INVALID_PACKAGE", reason: preflightRoute.reason ?? undefined };
        if (!preflightTarget.ok) return { ok: false, error: "INVALID_TARGET", reason: preflightTarget.code };
        
        return { ok: true };
      } catch (err) {
        if (retryCount < 1) {
          console.warn(`[criarPedido] v606 preflight falhou (tentativa ${retryCount + 1}), tentando retry...`);
          return executePreflight(retryCount + 1);
        }
        throw err;
      }
    };

    try {
      const result = await executePreflight();
      if (!result.ok) {
        if (result.error === "INVALID_TARGET") {
          try {
            const { supabaseAdmin: sbLog } = await import("@/integrations/supabase/client.server");
            await sbLog.from("pedidos").insert({
              instagram_user: clean(data.instagram_user),
              pacote: clean(pacoteEfetivo),
              quantidade: quantidadeEfetiva,
              valor: valorCobrar,
              status: "blocked",
              error_detail: `Bloqueio Preflight: ${result.reason}`,
            } as any);
          } catch { /* noop */ }
          return { ok: false as const, error: "INVALID_TARGET", reason: result.reason };
        }
        return { ok: false as const, error: "INVALID_PACKAGE" as const };
      }
    } catch (err) {
      if (valorCobrar >= PREFLIGHT_STRICT_BRL) {
        console.error("[criarPedido] v606 preflight falhou após retry em pacote caro:", err);
        return { ok: false as const, error: "GATEWAY_TIMEOUT" as const };
      }
    }


    // v649 — FASE 1: Ramificação estrita baseada no contrato.
    const metodo = data.metodo;
    const { cardAmount, cardBlockedReason } = await import("./card-pricing");
    if (metodo === "cartao") {
      const bloqueio = cardBlockedReason(valorCobrar);
      if (bloqueio) return { ok: false as const, error: bloqueio };
    }
    const valorCharge = metodo === "cartao" ? cardAmount(valorCobrar) : valorCobrar;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pedido, error } = await supabaseAdmin
      .from("pedidos")
      .insert({
        instagram_user: clean(data.instagram_user),
        pacote: clean(pacoteEfetivo),
        quantidade: quantidadeEfetiva,
        valor: valorCharge,
        status: "pending",
        metodo_pagamento: metodo,
        email_contato: data.email ?? null,
        whatsapp_contato: data.whatsapp_contato ?? null,
        utm_source: data.utm_source ?? null,
        utm_medium: data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        utm_content: data.utm_content ?? null,
        utm_term: data.utm_term ?? null,
        bump_offered: bumpOfertado,
        bump_accepted: bumpAplicado,
        affiliate_code: (hasPrime && discount > 0 ? "PRIME15" : null) as any,
      } as any)
      .select("id")
      .single();

    if (error || !pedido) {
      console.error("[criarPedido] erro ao salvar:", error);
      // v628 — Proteção contra falha em cascata: tenta registrar alerta, mas não bloqueia se falhar
      try {
        const { supabaseAdmin: sbAdmin } = await import("@/integrations/supabase/client.server");
        await sbAdmin.from("jarvis_alerts").insert({
          severidade: "critical",
          origem: "checkout",
          mensagem: `🚨 DATABASE_ERROR no checkout: falha ao inserir pedido para @${data.instagram_user}. Erro: ${error?.message || "desconhecido"}`,
          created_at: new Date().toISOString()
        });
      } catch { /* noop */ }
      
      return { ok: false as const, error: "DATABASE_ERROR" as const };
    }

    const valorFormatado = `R$ ${valorCharge.toFixed(2).replace(".", ",")}`;

    try {
      const gateway = await import("./mercadopago.server");
      const entrada = {
        id: pedido.id,
        pacote: pacoteEfetivo,
        quantidade: quantidadeEfetiva,
        valor: valorCharge,
        alvo: clean(data.instagram_user),
        email: data.email,
      };

      if (metodo === "cartao") {
        const card = await gateway.createMercadoPagoCardCheckout(entrada);
        // O webhook carimba o payment id ao receber a notificação (external_reference "pedido:").
        await supabaseAdmin
          .from("pedidos")
          .update({ mp_preference_id: card.id } as any)
          .eq("id", pedido.id);

        return {
          ok: true as const,
          metodo,
          pedidoId: pedido.id,
          preferenceId: card.id,
          checkoutUrl: card.checkoutUrl,
          initPoint: card.checkoutUrl,
          sandboxInitPoint: card.sandboxCheckoutUrl,
          pacoteFinal: pacoteEfetivo,
          quantidadeFinal: quantidadeEfetiva,
          valorFormatado,
          valorCobrado: valorCharge,
        };
      }

      const pix = await gateway.createMercadoPagoPixPayment(entrada);
      // Guardar o payment id já no nascimento é o que permite à contingência
      // consultar o Mercado Pago se o webhook atrasar ou falhar.
      if (pix.paymentId) {
        await supabaseAdmin
          .from("pedidos")
          .update({ mercado_pago_id: pix.paymentId } as any)
          .eq("id", pedido.id);
      }

      return {
        ok: true as const,
        metodo,
        pedidoId: pedido.id,
        preferenceId: pix.paymentId,
        paymentId: pix.paymentId,
        qrCode: pix.qrCode,
        qrCodeBase64: pix.qrCodeBase64,
        ticketUrl: pix.ticketUrl,
        expiresAt: pix.expiresAt,
        pacoteFinal: pacoteEfetivo,
        quantidadeFinal: quantidadeEfetiva,
        valorFormatado,
        valorCobrado: valorCharge,
      };
    } catch (err) {
      console.error("[criarPedido] erro MP:", err);
      // Pedido sem cobrança criada não pode ficar como "pending" enganando
      // funil, recuperação de Pix e semáforo. Marcamos o motivo real.
      try {
        await supabaseAdmin
          .from("pedidos")
          .update({
            status: "gateway_error",
            error_detail: `PAYMENT_GATEWAY_ERROR (${metodo}): ${(err as Error).message}`.slice(0, 500),
          } as any)
          .eq("id", pedido.id)
          .eq("status", "pending");
      } catch { /* noop */ }
      // v628 — Alerta de erro de gateway
      try {
        const { supabaseAdmin: sbAdmin } = await import("@/integrations/supabase/client.server");
        await sbAdmin.from("jarvis_alerts").insert({
          severidade: "critical",
          origem: "checkout",
          mensagem: `🚨 PAYMENT_GATEWAY_ERROR (${metodo}): falha ao gerar cobrança no Mercado Pago para o pedido ${pedido.id}. Erro: ${(err as Error).message}`,
          created_at: new Date().toISOString()
        });
      } catch { /* noop */ }

      return { ok: false as const, error: "PAYMENT_GATEWAY_ERROR" as const };
    }

  });
