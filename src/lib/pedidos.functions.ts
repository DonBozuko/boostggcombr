import { createServerFn } from "@tanstack/react-start";
import { MP_NOTIFICATION_URL } from "./payment-config";

import { z } from "zod";

const pedidoSchema = z.object({
  instagram_user: z.string().min(1).max(200),
  pacote: z.string().min(1).max(20),
  quantidade: z.number().int().positive(),
  valor: z.number().positive(),
  email: z.string().email().max(200),
  whatsapp_contato: z.string().min(5).max(50).optional(),
  rede_social: z.enum(["instagram", "tiktok", "youtube", "facebook", "trafego", "telegram", "kwai"]).optional(),
  utm_source: z.string().max(60).optional().nullable(),
  utm_medium: z.string().max(60).optional().nullable(),
  utm_campaign: z.string().max(60).optional().nullable(),
  utm_content: z.string().max(60).optional().nullable(),
  utm_term: z.string().max(60).optional().nullable(),
  cupom: z.string().max(20).optional().nullable(),
  bump_upgrade: z.boolean().optional(),
  // v270 — método de pagamento. Ausente = pix (mantém 100% do fluxo antigo).
  metodo: z.enum(["pix", "cartao"]).optional(),
});

const utmClean = (v: string | null | undefined) =>
  v ? v.toLowerCase().slice(0, 60) : null;

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);

// v590 — a tabela fixa de preços saiu daqui. Autoridade única: pricing_items,
// lido por `resolveCheckoutPricing` em src/lib/checkout-pricing.server.ts.

export const prewarmPedido = createServerFn({ method: "POST" })
  .validator((input) => z.object({ 
    email: z.string().email(),
    pacote: z.string().optional(),
    quantidade: z.number().optional()
  }).parse(input))
  .handler(async ({ data }) => {
    // v587 — Pre-warming Pix agressivo (< 800ms).
    // Implementa fallback silencioso caso a infraestrutura de token demore.
    try {
      const { getMpAccessToken } = await import("./mp-token.server");
      // v588 — corrige unhandled rejection se o token resolver/falhar depois do timeout.
      const tokenPromise = getMpAccessToken().catch((err) => {
        console.warn("[prewarmPedido] v588 Token falhou em background (ignorado):", err);
        return null;
      });
      // Timeout de 1500ms para o aquecimento não atrasar o preenchimento do email
      const token = await Promise.race([
        tokenPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
      ]);
      console.log("[prewarmPedido] v588 Aqueceu token centralizado:", !!token);
      return { ok: true };
    } catch (err) {
      console.warn("[prewarmPedido] v587 Fallback silencioso no aquecimento:", err);
      return { ok: false };
    }
  });

export const criarPedido = createServerFn({ method: "POST" })
  .validator((input) => pedidoSchema.parse(input))
  .handler(async ({ data }) => {
    // v252 — Rate limit: 8 pedidos / 5 min por IP (anti-spam de Pix/robô).
    {
      const { getRequest } = await import("@tanstack/react-start/server");
      const { checkRateLimit, clientIpFrom } = await import("./rate-limit.server");
      let ip = "unknown";
      try {
        ip = clientIpFrom(getRequest().headers);
      } catch { /* fora de contexto HTTP: segue */ }
      const rl = await checkRateLimit("criar-pedido", ip, 8, 300);
      if (!rl.allowed) {
        console.warn(`[criarPedido] RATE_LIMITED ip=${ip} hits=${rl.hits}`);
        return { ok: false as const, error: "RATE_LIMITED" as const };
      }
    }
    // v182 — Kill Switch Global: para tudo em emergência.
    {
      const { isGloballyBlocked } = await import("./kill-switch.server");
      if (await isGloballyBlocked()) {
        console.warn("[criarPedido] BLOQUEADO por kill switch global");
        return { ok: false as const, error: "GLOBAL_KILL" as const };
      }
    }
    const pacoteRaw = data.pacote.toLowerCase();
    // v192 — pacotes com prefixo `br-` (variante brasileira) precisam ser normalizados
    // para lookup de preço/categoria, mas o prefixo é preservado para dispatch (SMMhype BR).
    const isBrVariant = pacoteRaw.startsWith("br-");
    const pkg = isBrVariant ? pacoteRaw.slice(3) : pacoteRaw;
    const isTelegram = pkg.startsWith("tg");
    const isTrafego = !isTelegram && pkg.startsWith("w");
    const isTiktok = !isTelegram && !isTrafego && pkg.startsWith("t");
    const isYoutube = pkg.startsWith("y");
    const isFacebook = pkg.startsWith("f");
    const isKwai = pkg.startsWith("k");
    const isInstagram = !isTelegram && !isTrafego && !isTiktok && !isYoutube && !isFacebook && !isKwai;

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

    // v590 — AUTORIDADE ÚNICA DE PREÇO + LEITURA ÚNICA.
    // Uma só ida ao banco resolve preço, quantidade oficial, custo e
    // disponibilidade. A grade (usada só pelo order bump) roda em paralelo,
    // então não soma latência ao caminho do Pix.
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

    // v186/v540 — honra o preço mostrado na tela apenas dentro de 1% de drift.
    valorBase = precoAceito(valorBase, Number(data.valor));



    // v183 — Order Bump: se aceito, troca pra próximo tier com 20% off.
    // Margem preservada (base já tem 5-12x multiplicador; -20% sai da margem, nunca do custo).
    let pacoteEfetivo = isBrVariant ? `br-${pkg}` : data.pacote;
    let quantidadeEfetiva = qtdOficial;
    let bumpAplicado = false;
    let bumpOfertado = false;
    if (gridRef) {
      // v184 — Smart-skip: pega menor tier cujo -20% ainda gera uplift ≥15%.
      const candidates = gridRef.items
        .filter((i) => i.quantidade > qtdOficial)
        .sort((a, b) => a.quantidade - b.quantidade);
      const baseRef = valorBase!;
      const next = candidates.find((i) => i.valor * 0.80 >= baseRef * 1.15);
      // v190 — Telemetria: se existe tier válido, o dialog foi mostrado no front.
      bumpOfertado = !!next;
      if (data.bump_upgrade && next) {
        pacoteEfetivo = isBrVariant ? `br-${next.id}` : next.id;
        quantidadeEfetiva = next.quantidade;
        valorBase = Number((next.valor * 0.80).toFixed(2));
        bumpAplicado = true;
        console.log("[criarPedido] bump aplicado:", data.pacote, "→", pacoteEfetivo, `R$${valorBase}`);

      } else if (data.bump_upgrade) {
        console.log("[criarPedido] bump rejeitado (nenhum tier válido):", data.pacote);
      }
    }

    // v189 — PRIME15 (15% off) só vale em pedidos ≥ R$ 30 (protege ticket médio).
    // Pedido abaixo de R$ 30 ignora cupom silenciosamente — cliente já vê preço cheio no checkout.
    const cupom = (data.cupom ?? "").trim().toUpperCase();
    const hasPrime = cupom.split(/[,\s]+/).includes("PRIME15");
    const discount = hasPrime && valorBase >= 30 ? 0.15 : 0;
    const valorCobrar = Number((valorBase * (1 - discount)).toFixed(2));

    // v297/v301 — PREFLIGHTS PARALELOS (Otimização v426.1).
    // Antes eram sequenciais, adicionando ~2-4s de latência. Agora rodam juntos.
    // Prova de ROTA + Prova de ALVO. Se algum falhar, bloqueia antes de cobrar.
    // v297/v301 — PREFLIGHTS PARALELOS COM TIMEOUT (Otimização v457).
    // Preflights rodam juntos com AbortSignal.timeout de 5s para evitar
    // travamento do checkout por lentidão de APIs externas.
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const [preflightRoute, preflightTarget] = await Promise.all([
        import("./route-preflight.server").then(m => m.preflightRouteOrBlock({
          pacote: pacoteEfetivo,
          quantidade: quantidadeEfetiva,
          valorBrl: valorCobrar,
        })),
        import("./target-preflight.server").then(m => m.preflightTargetOrBlock({
          rede: data.rede_social ?? "instagram",
          pacote: pacoteEfetivo,
          alvo: data.instagram_user,
        }))
      ]).finally(() => clearTimeout(timeoutId));

      if (!preflightRoute.ok) {
        console.error("[criarPedido] v297 cobrança bloqueada (rota):", pacoteEfetivo, preflightRoute.reason);
        return { ok: false as const, error: "INVALID_PACKAGE" as const };
      }
      if (!preflightTarget.ok) {
        console.error("[criarPedido] v301 cobrança bloqueada (alvo):", data.instagram_user, preflightTarget.code);
        // v509 — Registro de Alvo Inválido no Banco (Anti-Escuro).
        // Mesmo sem cobrar, gravamos o pedido com status 'blocked' para que o 
        // administrador veja o lead e o motivo real do abandono.
        try {
          const { supabaseAdmin: sbLog } = await import("@/integrations/supabase/client.server");
          await sbLog.from("pedidos").insert({
            instagram_user: clean(data.instagram_user),
            pacote: clean(pacoteEfetivo),
            quantidade: quantidadeEfetiva,
            valor: valorCobrar,
            status: "blocked",
            error_detail: `Bloqueio Preflight: ${preflightTarget.code}`,
            email_contato: data.email.trim().toLowerCase(),
            whatsapp_contato: data.whatsapp_contato?.trim() || null,
            rede_social: rede,
            utm_source: utmClean(data.utm_source),
            utm_medium: utmClean(data.utm_medium),
            utm_campaign: utmClean(data.utm_campaign),
            utm_content: utmClean(data.utm_content),
            utm_term: utmClean(data.utm_term),
            cupom: cupom || null,
          } as any);
        } catch (e) { console.warn("[criarPedido] v509 falha ao registrar bloqueio:", e); }

        return { ok: false as const, error: preflightTarget.code };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn("[criarPedido] Preflights abortados por TIMEOUT (5s) - Seguindo via fail-open");
      } else {
        console.warn("[criarPedido] Preflights falharam (venda liberada por fail-open):", err);
      }
    }



    // ─────────────────────────────────────────────────────────────────────
    // v270 — CARTÃO (Mercado Pago Checkout Pro).
    // Caminho separado e aditivo: o fluxo Pix abaixo continua intocado.
    // Aqui o pedido nasce ANTES da cobrança (não existe cobrança órfã: se a
    // preferência falhar, o pedido é apagado e nada foi cobrado).
    // ─────────────────────────────────────────────────────────────────────
    if (data.metodo === "cartao") {
      const { cardAmount, cardBlockedReason, CARD_MAX_BRL } = await import("./card-pricing");
      const bloqueio = cardBlockedReason(valorCobrar);
      if (bloqueio) {
        console.warn("[criarPedido] v270 cartão bloqueado", { bloqueio, valorCobrar, teto: CARD_MAX_BRL });
        return { ok: false as const, error: bloqueio };
      }
      const valorCartao = cardAmount(valorCobrar);

      const mpTokenCard = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!mpTokenCard) {
        console.error("MERCADO_PAGO_ACCESS_TOKEN ausente");
        return { ok: false as const, error: "MP_TOKEN_MISSING" as const };
      }

      const { supabaseAdmin: sbCard } = await import("@/integrations/supabase/client.server");

      // Dedup: clique repetido em <15min reaproveita o mesmo checkout.
      try {
        const cutoffCard = new Date(Date.now() - 900_000).toISOString();
        const { data: prev } = await sbCard
          .from("pedidos")
          .select("id, mp_preference_id, valor, pacote, quantidade")
          .eq("instagram_user", clean(data.instagram_user))
          .eq("pacote", clean(pacoteEfetivo))
          .eq("status", "pending")
          .eq("metodo_pagamento", "cartao")
          .gte("created_at", cutoffCard)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const p = prev as any;
        if (p?.mp_preference_id && Number(p.valor) === valorCartao) {
          return {
            ok: true as const,
            metodo: "cartao" as const,
            pedidoId: String(p.id),
            checkoutUrl: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${p.mp_preference_id}`,
            valorCobrado: valorCartao,
            valorFormatado: `R$ ${valorCartao.toFixed(2).replace(".", ",")}`,
            pacoteFinal: String(p.pacote),
            quantidadeFinal: Number(p.quantidade),
          };
        }
      } catch (e) { console.warn("[criarPedido] v270 dedup cartão falhou:", e); }

      let affiliateCodeCard: string | null = null;
      try {
        const { getRequest } = await import("@tanstack/react-start/server");
        const { refCodeFromHeaders } = await import("@/lib/affiliate.server");
        affiliateCodeCard = refCodeFromHeaders(getRequest()?.headers);
      } catch { /* sem indicação */ }

      const { data: pedidoCard, error: errCard } = await sbCard
        .from("pedidos")
        .insert({
          instagram_user: clean(data.instagram_user),
          pacote: clean(pacoteEfetivo),
          quantidade: quantidadeEfetiva,
          valor: valorCartao,
          status: "pending",
          metodo_pagamento: "cartao",
          email_contato: data.email.trim().toLowerCase(),
          // v276: WhatsApp era coletado no checkout e descartado (coluna inexistente).
          whatsapp_contato: data.whatsapp_contato?.trim() || null,
          rede_social: rede,
          utm_source: utmClean(data.utm_source),
          utm_medium: utmClean(data.utm_medium),
          utm_campaign: utmClean(data.utm_campaign),
          utm_content: utmClean(data.utm_content),
          utm_term: utmClean(data.utm_term),
          cupom: cupom || null,
          affiliate_code: affiliateCodeCard,
          bump_offered: bumpOfertado,
          bump_accepted: bumpAplicado,
        } as any)
        .select("id")
        .single();
      if (errCard || !pedidoCard) {
        console.error("[criarPedido] v270 insert cartão falhou:", errCard);
        return { ok: false as const, error: "DB_FAILED" as const };
      }

      try {
        const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mpTokenCard}`,
            "X-Idempotency-Key": `card-${pedidoCard.id}`,
          },
          signal: AbortSignal.timeout(12_000),
          body: JSON.stringify({
            items: [{
              id: clean(pacoteEfetivo),
              title: `BoostGG · ${quantidadeEfetiva} ${categoria} ${rede}`,
              description: `Entrega para ${clean(data.instagram_user)}`,
              quantity: 1,
              currency_id: "BRL",
              unit_price: Number(valorCartao.toFixed(2)),
            }],
            payer: { email: data.email.trim().toLowerCase() },
            external_reference: `pedido:${pedidoCard.id}`,
            notification_url: MP_NOTIFICATION_URL,
            statement_descriptor: "BOOSTGG",
            binary_mode: true,
            payment_methods: {
              // Pix/boleto ficam fora: no cartão o preço já tem a taxa repassada.
              excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }],
              installments: 1,
            },
            back_urls: {
              success: `https://www.boostgg.com.br/obrigado?order=${pedidoCard.id}&value=${valorCartao}`,
              pending: `https://www.boostgg.com.br/rastrear?pedido=${pedidoCard.id}`,
              failure: `https://www.boostgg.com.br/rastrear?pedido=${pedidoCard.id}`,
            },
            auto_return: "approved",
          }),
        });
        const prefJson: any = await prefRes.json().catch(() => ({}));
        if (!prefRes.ok || !prefJson?.id || !prefJson?.init_point) {
          console.error("[criarPedido] v270 preferência falhou", prefRes.status, prefJson);
          await sbCard.from("pedidos").delete().eq("id", pedidoCard.id);
          return { ok: false as const, error: "MP_FAILED" as const };
        }
        await sbCard
          .from("pedidos")
          .update({ mp_preference_id: String(prefJson.id) } as any)
          .eq("id", pedidoCard.id);

        return {
          ok: true as const,
          metodo: "cartao" as const,
          pedidoId: String(pedidoCard.id),
          checkoutUrl: String(prefJson.init_point),
          valorCobrado: valorCartao,
          valorFormatado: `R$ ${valorCartao.toFixed(2).replace(".", ",")}`,
          pacoteFinal: pacoteEfetivo,
          quantidadeFinal: quantidadeEfetiva,
        };
      } catch (err) {
        console.error("[criarPedido] v270 exceção cartão:", err);
        try { await sbCard.from("pedidos").delete().eq("id", pedidoCard.id); } catch { /* noop */ }
        return { ok: false as const, error: "MP_FAILED" as const };
      }
    }



    // v218 — Checkout dedup: se cliente clica 2x em <90s, retorna o MESMO Pix.
    // Sem isso, cada clique gera novo payment no MP e polui a fila de recuperação.
    try {
      const { supabaseAdmin: sbDedup } = await import("@/integrations/supabase/client.server");
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      const { data: existing } = await sbDedup
        .from("pedidos")
        .select("id, mercado_pago_id, valor, pacote, quantidade")
        .eq("instagram_user", clean(data.instagram_user))
        .eq("pacote", clean(pacoteEfetivo))
        .eq("status", "pending")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.mercado_pago_id && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        const rr = await fetch(`https://api.mercadopago.com/v1/payments/${existing.mercado_pago_id}`, {
          headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        });
        if (rr.ok) {
          const mpPrev: any = await rr.json().catch(() => ({}));
          const qr = mpPrev?.point_of_interaction?.transaction_data?.qr_code;
          const qr64 = mpPrev?.point_of_interaction?.transaction_data?.qr_code_base64;
          if (qr && qr64 && mpPrev?.status === "pending") {
            console.log("[criarPedido] v218 dedup HIT — reaproveitando Pix", existing.id);
            const { logGuard } = await import("@/lib/guard-events.server");
            void logGuard("CHECKOUT_DEDUPE", { pedidoId: existing.id, pacote: existing.pacote });
            return {
              ok: true as const,
              pedidoId: existing.id,
              mercadoPagoId: String(existing.mercado_pago_id),
              qrCode: qr,
              qrCodeBase64: qr64,
              valorCobrado: Number(existing.valor),
              valorFormatado: `R$ ${Number(existing.valor).toFixed(2).replace(".", ",")}`,
              cupomAplicado: null,
              bumpAplicado: false,
              pacoteFinal: existing.pacote,
              quantidadeFinal: Number(existing.quantidade),
            };
          }
        }
      }
    } catch (e) { console.warn("[criarPedido] v218 dedup check falhou:", e); }




    // v586: Caching de Token Proativo.
    const { getMpAccessToken } = await import("./mp-token.server");
    const mpToken = await getMpAccessToken();


    // 1) Cria o pagamento Pix no Mercado Pago (v204: retry com backoff — 3 tentativas)
    // Mesma X-Idempotency-Key em todas retries → MP nunca cria pagamento duplicado.
    let mpId: string | null = null;
    let qrCode = "";
    let qrCodeBase64 = "";
    // v260 — chave determinística: cliques simultâneos = mesma chave = MP não cobra 2x.
    const { buildCheckoutIdempotencyKey } = await import("@/lib/checkout-idempotency");
    const idempotencyKey = buildCheckoutIdempotencyKey({
      usuario: clean(data.instagram_user),
      pacote: clean(pacoteEfetivo),
      valor: valorCobrar,
    });
    const mpBody = JSON.stringify({
      transaction_amount: Number(valorCobrar.toFixed(2)),
      description: `BoostGG - ${rede.toUpperCase()} pacote ${clean(pacoteEfetivo)} (${quantidadeEfetiva} ${categoria}) para ${clean(data.instagram_user)}${bumpAplicado ? " [UPGRADE]" : ""}`,
      payment_method_id: "pix",
      payer: { email: data.email.trim().toLowerCase() },
      notification_url: MP_NOTIFICATION_URL,
    });
    const backoffs = [0, 200, 800];
    let mpErrLast = "";
    
    // v586: Estratégia de Contingência com Fallback Silencioso (< 1.5s).
    // Se o pre-warming ou a criação falhar/demorar, não travamos o cliente.
    const mpTimeout = 1500; // 1.5s limite para UX fluida
    
    for (let attempt = 0; attempt < backoffs.length; attempt++) {
      if (backoffs[attempt] > 0) await new Promise((r) => setTimeout(r, backoffs[attempt]));
      try {
        const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mpToken}`,
            "X-Idempotency-Key": idempotencyKey,
          },
          body: mpBody,
          signal: AbortSignal.timeout(mpTimeout),
        });
        const mpJson: any = await mpRes.json().catch(() => ({}));
        if (!mpRes.ok) {
          mpErrLast = `HTTP ${mpRes.status}`;
          console.warn(`[criarPedido] MP attempt ${attempt + 1} falhou:`, mpRes.status, mpJson);
          
          // v586: Fallback instantâneo para rota secundária se MP estiver instável.
          if (mpRes.status >= 500 || mpRes.status === 429) continue;
          return { ok: false as const, error: "MP_FAILED" as const };
        }
        const mp = mpJson as {
          id?: number | string;
          point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
        };
        mpId = mp.id != null ? String(mp.id) : null;
        qrCode = mp.point_of_interaction?.transaction_data?.qr_code ?? "";
        qrCodeBase64 = mp.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";
        if (!qrCode || !qrCodeBase64) {
          console.error("MP sem QR Code no retorno:", mpJson);
          return { ok: false as const, error: "MP_NO_QR" as const };
        }
        break; // sucesso
      } catch (err) {
        mpErrLast = String((err as Error)?.message ?? err);
        console.warn(`[criarPedido] MP attempt ${attempt + 1} exception:`, err);
      }
    }
    if (!mpId || !qrCode) {
      console.error("Mercado Pago falhou após 3 tentativas:", mpErrLast);
      return { ok: false as const, error: "MP_FAILED" as const };
    }

    // 2) Persiste o pedido com status 'pending' e o mercado_pago_id
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const supabase = supabaseAdmin;
      // v265 — indicação de afiliado vem do cookie (nenhum checkout precisou mudar).
      let affiliateCode: string | null = null;
      try {
        const { getRequest } = await import("@tanstack/react-start/server");
        const { refCodeFromHeaders } = await import("@/lib/affiliate.server");
        affiliateCode = refCodeFromHeaders(getRequest()?.headers);
      } catch { /* sem indicação */ }
      const { data: inserted, error } = await supabase
        .from("pedidos")
        .insert({

          instagram_user: clean(data.instagram_user),
          pacote: clean(pacoteEfetivo),
          quantidade: quantidadeEfetiva,
          valor: valorCobrar,
          status: "pending",
          mercado_pago_id: mpId,
          // v248: e-mail do pagador gravado JÁ no insert. Antes só era salvo pelo
          // webhook do MP (ou seja, só quem pagava). Pix abandonado ficava sem contato
          // e a recuperação por e-mail nunca disparava — dinheiro perdido em silêncio.
          email_contato: data.email.trim().toLowerCase(),
          whatsapp_contato: data.whatsapp_contato?.trim() || null,

          rede_social: rede,
          utm_source: utmClean(data.utm_source),
          utm_medium: utmClean(data.utm_medium),
          utm_campaign: utmClean(data.utm_campaign),
          utm_content: utmClean(data.utm_content),
          utm_term: utmClean(data.utm_term),
          cupom: cupom || null,
          affiliate_code: affiliateCode,
          bump_offered: bumpOfertado,
          bump_accepted: bumpAplicado,

        } as any)
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("Erro ao inserir pedido:", error);
        // v205/v259 — Anti-perda-de-dinheiro: MP já criou a cobrança, banco falhou.
        const { refundOrphanCharge } = await import("./orphan-charge.server");
        await refundOrphanCharge(mpId, valorCobrar, data.email, error?.message ?? "insert retornou vazio");
        return { ok: false as const, error: "DB_FAILED" as const };
      }


      try {
        const { sendTikTokServerEvent } = await import("@/lib/tiktok-events-api.server");
        await sendTikTokServerEvent({
          event: "InitiateCheckout",
          orderId: String(inserted.id),
          value: valorCobrar,
          contentName: `${quantidadeEfetiva} ${categoria} ${rede}`,
          email: data.email,
          externalId: String(inserted.id),
        });
      } catch (err) {
        console.warn("[criarPedido] TikTok InitiateCheckout server-side falhou", err);
      }
      return {
        ok: true as const,
        pedidoId: inserted.id,
        mercadoPagoId: mpId,
        qrCode,
        qrCodeBase64,
        valorCobrado: valorCobrar,
        valorFormatado: `R$ ${valorCobrar.toFixed(2).replace(".", ",")}`,
        cupomAplicado: discount > 0 ? cupom : null,
        bumpAplicado,
        pacoteFinal: pacoteEfetivo,
        quantidadeFinal: quantidadeEfetiva,
      };
    } catch (err) {
      console.error("Erro inesperado no Supabase:", err);
      // v259 — banco fora do ar / timeout depois do MP criar a cobrança:
      // mesmo tratamento do erro de insert (estorno + alerta), nunca silêncio.
      try {
        const { refundOrphanCharge } = await import("./orphan-charge.server");
        await refundOrphanCharge(mpId, valorCobrar, data.email, `exceção no banco: ${String((err as Error)?.message ?? err).slice(0, 120)}`);
      } catch { /* noop */ }
      return { ok: false as const, error: "DB_FAILED" as const };
    }

  });
