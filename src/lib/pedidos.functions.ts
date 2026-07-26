import { createServerFn } from "@tanstack/react-start";
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

// Tabela oficial (fonte de verdade no servidor) — keyed por pacote id.
// Evita preço adulterado pelo cliente e diferencia seguidores vs curtidas.
const PRICE_TABLE: Record<string, { quantidade: number; valor: number }> = {
  // Instagram — Seguidores
  p100:   { quantidade: 100,    valor: 5.0 },
  p500:   { quantidade: 500,    valor: 12.0 },
  p1k:    { quantidade: 1000,   valor: 18.0 },
  p2k:    { quantidade: 2000,   valor: 30.0 },
  p5k:    { quantidade: 5000,   valor: 65.0 },
  p10k:   { quantidade: 10000,  valor: 120.0 },
  p20k:   { quantidade: 20000,  valor: 220.0 },
  p50k:   { quantidade: 50000,  valor: 490.0 },
  p100k:  { quantidade: 100000, valor: 890.0 },
  // Instagram — Curtidas (service 18860)
  l100:   { quantidade: 100,  valor: 3.0 },
  l500:   { quantidade: 500,  valor: 7.0 },
  l1k:    { quantidade: 1000, valor: 12.0 },
  l2k:    { quantidade: 2000, valor: 19.0 },
  l5k:    { quantidade: 5000, valor: 39.0 },
  // Instagram — Visualizações
  v1k:    { quantidade: 1000,  valor: 5.0 },
  v5k:    { quantidade: 5000,  valor: 12.0 },
  v10k:   { quantidade: 10000, valor: 19.0 },
  v25k:   { quantidade: 25000, valor: 39.0 },
  v50k:   { quantidade: 50000, valor: 69.0 },
  // TikTok — Seguidores (service 14330)
  tf100:  { quantidade: 100,  valor: 9.0 },
  tf500:  { quantidade: 500,  valor: 29.0 },
  tf1k:   { quantidade: 1000, valor: 49.0 },
  // TikTok — Curtidas (service 19191)
  tl500:  { quantidade: 500,  valor: 9.0 },
  tl1k:   { quantidade: 1000, valor: 15.0 },
  tl2k:   { quantidade: 2000, valor: 27.0 },
  // TikTok — Visualizações (service 14907)
  tv5k:   { quantidade: 5000,  valor: 7.0 },
  tv10k:  { quantidade: 10000, valor: 12.0 },
  tv50k:  { quantidade: 50000, valor: 39.0 },
  // YouTube — Inscritos (service 19440 — R$ 97,86/1k, recarga 30 dias)
  ys100:  { quantidade: 100,  valor: 29.0 },
  ys500:  { quantidade: 500,  valor: 99.0 },
  ys1k:   { quantidade: 1000, valor: 189.0 },
  // YouTube — Visualizações (service 14321 — R$ 3,27/1k, recarga vitalícia)
  yv1k:   { quantidade: 1000,  valor: 19.0 },
  yv5k:   { quantidade: 5000,  valor: 59.0 },
  yv10k:  { quantidade: 10000, valor: 99.0 },
  // Facebook — Seguidores (service 18870)
  ff500:  { quantidade: 500,  valor: 19.0 },
  ff1k:   { quantidade: 1000, valor: 29.0 },
  ff2k5:  { quantidade: 2500, valor: 69.0 },
  // Facebook — Curtidas (service 7593)

  fl500:  { quantidade: 500,  valor: 9.0 },
  fl1k:   { quantidade: 1000, valor: 15.0 },
  fl2k:   { quantidade: 2000, valor: 27.0 },
  // Tráfego Web — ID 9313 (Brasil) e 10351 (Mundial)
  wbr1k:  { quantidade: 1000,  valor: 19.0 },
  wbr5k:  { quantidade: 5000,  valor: 69.0 },
  wbr10k: { quantidade: 10000, valor: 119.0 },
  wgl1k:  { quantidade: 1000,  valor: 9.0 },
  wgl5k:  { quantidade: 5000,  valor: 29.0 },
  wgl10k: { quantidade: 10000, valor: 49.0 },
  // Telegram — Canal (service 19106)
  tgc500: { quantidade: 500,  valor: 19.0 },
  tgc1k:  { quantidade: 1000, valor: 35.0 },
  // Telegram — Grupo (service 19107)
  tgg500: { quantidade: 500,  valor: 19.0 },
  tgg1k:  { quantidade: 1000, valor: 35.0 },
  // Kwai — fallback estático (v203). Se pricing_engine cair, Kwai continua vendendo.
  // Preços refletem a categoria em pricing_engine (kf/kl/kv). Ajuste via admin altera engine;
  // essa tabela só entra em ação se o pricing-engine.server falhar.
  kf500:  { quantidade: 500,   valor: 19.0 },
  kf1k:   { quantidade: 1000,  valor: 29.0 },
  kf2k:   { quantidade: 2000,  valor: 49.0 },
  kf5k:   { quantidade: 5000,  valor: 99.0 },
  kl500:  { quantidade: 500,   valor: 9.0 },
  kl1k:   { quantidade: 1000,  valor: 15.0 },
  kl2k:   { quantidade: 2000,  valor: 27.0 },
  kv5k:   { quantidade: 5000,  valor: 9.0 },
  kv10k:  { quantidade: 10000, valor: 15.0 },
};

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) => pedidoSchema.parse(input))
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

    // Universal Single Source of Truth: pricing-engine para TODAS as 6 redes.
    // PRICE_TABLE permanece apenas como fallback de último recurso.
    let valorBase: number | null = null;
    let qtdOficial: number = data.quantidade;
    let gridRef: Awaited<ReturnType<typeof import("./pricing-engine.server").getPricingGridImpl>> | null = null;
    let catRef: string | null = null;

    // v211 — BR variants (`br-*`) live in a separate pricing_items subcategory
    // (ex: `instagram:seguidores:br`) that categoryFromPacote() doesn't map.
    // Query pricing_items directly by full pacote id to avoid INVALID_PACKAGE.
    if (isBrVariant) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("pricing_items" as any)
          .select("price_brl, quantidade")
          .eq("pacote", pacoteRaw)
          .maybeSingle();
        const v = Number((row as any)?.price_brl);
        const q = Number((row as any)?.quantidade);
        if (Number.isFinite(v) && v > 0 && Number.isFinite(q) && q > 0) {
          valorBase = v;
          qtdOficial = q;
        }
      } catch (err) {
        console.error("[criarPedido] BR lookup falhou:", err);
      }
    }

    if (valorBase == null) {
      try {
        const { getPricingGridImpl, categoryFromPacote } = await import("./pricing-engine.server");
        const cat = categoryFromPacote(pkg);
        if (cat) {
          catRef = cat;
          const grid = await getPricingGridImpl(cat);
          gridRef = grid;
          const item = grid.items.find((i) => i.id === pkg);
          if (item) {
            valorBase = item.valor;
            qtdOficial = item.quantidade;
          }
        }
      } catch (err) {
        console.error("[criarPedido] pricing-engine falhou, usando fallback:", err);
      }
    }
    if (valorBase == null) {
      const oficial = PRICE_TABLE[pkg];
      if (!oficial) {
        console.error("[criarPedido] pacote inválido:", data.pacote);
        // v211 — Alerta imediato: pacote inválido = venda perdida silenciosa.
        try {
          const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
          await dispatchWhatsappAlert(
            `⚠️ CLIENTE TENTOU PACOTE QUE NÃO EXISTE\n\nPROBLEMA: alguém clicou no pacote "${data.pacote}" (${data.quantidade} ${categoria} ${rede}) mas o backend não conhece esse ID. Checkout travou pro cliente.\n\nO QUE FAZER: verificar se esse pacote aparece no front mas sumiu do pricing_items. Rodar sync-pricing no admin.`,
          ).catch(() => {});
        } catch { /* noop */ }
        return { ok: false as const, error: "INVALID_PACKAGE" as const };
      }
      valorBase = oficial.valor;
      qtdOficial = oficial.quantidade;
    }
    if (qtdOficial !== data.quantidade) {
      console.error("[criarPedido] quantidade divergente:", data.pacote, data.quantidade, qtdOficial);
      return { ok: false as const, error: "INVALID_PACKAGE" as const };
    }

    // v214 — Trava sellable universal: consulta flag persistente do teste seco
    // (`is_sellable` + `sellable_reason`) atualizada por cron diário. Bloqueia
    // pacote pausado antes de cobrar Pix. Fallback estrutural (sem custo /
    // sem provedor) mantido pra casos onde o dry-run ainda não rodou.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: sellRow } = await supabaseAdmin
        .from("pricing_items" as any)
        .select("cost_brl, is_sellable, sellable_reason, smmhype_service_id, smmpanel_service_id, verified_service_id")
        .eq("pacote", pacoteRaw)
        .maybeSingle();
      if (sellRow) {
        const row = sellRow as any;
        const hasProvider = !!row.smmhype_service_id || !!row.smmpanel_service_id || !!row.verified_service_id;
        const hasCost = Number(row.cost_brl) > 0;
        const blocked = row.is_sellable === false || !hasProvider || !hasCost;
        if (blocked) {
          const motivo = row.sellable_reason ?? (!hasProvider ? "Sem fornecedor vinculado" : !hasCost ? "Custo zerado" : "Pacote pausado");
          try {
            const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
            await dispatchWhatsappAlert(
              `🛑 PACOTE BLOQUEADO ANTES DE COBRAR\n\nPROBLEMA: cliente tentou "${data.pacote}" (${data.quantidade} ${categoria} ${rede}). Motivo: ${motivo}. Bloqueei o pagamento pra não cobrar sem conseguir entregar.\n\nO QUE FAZER: abrir Admin › Saúde do Catálogo, ver o pacote em vermelho e vincular fornecedor OU tirar do site.`,
            ).catch(() => {});
          } catch { /* noop */ }
          return { ok: false as const, error: "INVALID_PACKAGE" as const };
        }
      }
    } catch (err) {
      console.error("[criarPedido] sellable check falhou:", err);
      // não bloqueia — falha do check não deve derrubar venda válida
    }




    // v186 — Honor client-shown price to preserve UX consistency (dropdown ≠ Pix bug).
    // Only accept when client value is within 10% of server value (anti-tampering).
    // Never allow below the server floor for the current tier.
    const serverValor = valorBase!;
    const clientValor = Number(data.valor);
    if (Number.isFinite(clientValor) && clientValor > 0) {
      const drift = Math.abs(clientValor - serverValor) / serverValor;
      if (drift <= 0.10 && clientValor >= serverValor * 0.90) {
        valorBase = Number(clientValor.toFixed(2));
      }
      // else: mantém serverValor (cliente tentou tamper ou preço mudou muito)
    }


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
            notification_url: "https://boostgg.com.br/api/public/mp-webhook",
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




    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpToken) {
      console.error("MERCADO_PAGO_ACCESS_TOKEN ausente");
      return { ok: false as const, error: "MP_TOKEN_MISSING" as const };
    }

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
      notification_url: "https://boostgg.com.br/api/public/mp-webhook",
    });
    const backoffs = [0, 500, 1500];
    let mpErrLast = "";
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
          signal: AbortSignal.timeout(12_000),
        });
        const mpJson: unknown = await mpRes.json().catch(() => ({}));
        if (!mpRes.ok) {
          mpErrLast = `HTTP ${mpRes.status}`;
          console.warn(`[criarPedido] MP attempt ${attempt + 1} falhou:`, mpRes.status, mpJson);
          // Só tenta de novo em 5xx/timeout. 4xx (rejeição) sai direto.
          if (mpRes.status < 500) return { ok: false as const, error: "MP_FAILED" as const };
          continue;
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
