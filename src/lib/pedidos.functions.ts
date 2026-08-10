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

    const PREFLIGHT_STRICT_BRL = 100;
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
        timeoutId = setTimeout(() => reject(new Error("PREFLIGHT_TIMEOUT")), 5000);
      });
      const [preflightRoute, preflightTarget] = await Promise.race([preflights, timeout])
        .finally(() => { if (timeoutId) clearTimeout(timeoutId); });

      if (!preflightRoute.ok) {
        console.error("[criarPedido] v297 cobrança bloqueada (rota):", pacoteEfetivo, preflightRoute.reason);
        return { ok: false as const, error: "INVALID_PACKAGE" as const };
      }
      if (!preflightTarget.ok) {
        console.error("[criarPedido] v301 cobrança bloqueada (alvo):", data.instagram_user, preflightTarget.code);
        try {
          const { supabaseAdmin: sbLog } = await import("@/integrations/supabase/client.server");
          await sbLog.from("pedidos").insert({
            instagram_user: clean(data.instagram_user),
            pacote: clean(pacoteEfetivo),
            quantidade: quantidadeEfetiva,
            valor: valorCobrar,
            status: "blocked",
            error_detail: `Bloqueio Preflight: ${preflightTarget.code}`,
          } as any);
        } catch { /* noop */ }
        return { ok: false as const, error: "INVALID_TARGET", reason: preflightTarget.code };
      }
    } catch (err) {
      if (valorCobrar >= PREFLIGHT_STRICT_BRL) {
        console.error("[criarPedido] v304 preflight falhou em pacote caro — abortando:", err);
        return { ok: false as const, error: "GATEWAY_TIMEOUT" as const };
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pedido, error } = await supabaseAdmin
      .from("pedidos")
      .insert({
        instagram_user: clean(data.instagram_user),
        pacote: clean(pacoteEfetivo),
        quantidade: quantidadeEfetiva,
        valor: valorCobrar,
        status: "pending",
        bump_ofertado: bumpOfertado,
        bump_aplicado: bumpAplicado,
        cupom_aplicado: (hasPrime && discount > 0 ? "PRIME15" : null) as any,
      } as any)
      .select("id")
      .single();

    if (error || !pedido) {
      console.error("[criarPedido] erro ao salvar:", error);
      return { ok: false as const, error: "DATABASE_ERROR" as const };
    }

    try {
      const { createMercadoPagoPreference } = await import("./mercadopago.server");
      const pref = await createMercadoPagoPreference({
        id: pedido.id,
        pacote: pacoteEfetivo,
        quantidade: quantidadeEfetiva,
        valor: valorCobrar,
        alvo: clean(data.instagram_user),
      });

      return {
        ok: true as const,
        pedidoId: pedido.id,
        preferenceId: pref.id,
        initPoint: pref.initPoint,
        sandboxInitPoint: pref.sandboxInitPoint,
        pacoteFinal: pacoteEfetivo,
        quantidadeFinal: quantidadeEfetiva,
        valorFormatado: `R$ ${valorCobrar.toFixed(2).replace(".", ",")}`,
        valorCobrado: valorCobrar,
      };
    } catch (err) {
      console.error("[criarPedido] erro MP:", err);
      return { ok: false as const, error: "PAYMENT_GATEWAY_ERROR" as const };
    }
  });
