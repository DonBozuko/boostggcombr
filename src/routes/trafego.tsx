import { buildProductJsonLd, buildFaqJsonLd } from "@/lib/seo-jsonld";
import { normalizeCheckoutEmail, checkoutEmailError } from "@/lib/checkout-email";
import { FaqSection, FAQS } from "@/components/FaqSection";
import { CHECKOUT_SUCCESS_TITLE, CHECKOUT_SUCCESS_MESSAGE_CLEAN } from "@/lib/checkout-messages";
import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { supabase } from "@/integrations/supabase/client";
import { JarvisBadge } from "@/components/JarvisBadge";
import { FabianoBadge } from "@/components/FabianoBadge";
import { SocialProofPopup } from "@/components/SocialProofPopup";
import { PlansShowcaseProvider, ShowcaseTrigger, ShowcaseShell } from "@/components/PlansShowcase";
import { MobileFrame } from "@/components/MobileFrame";
import { PremiumCategorySelector } from "@/components/PremiumCategorySelector";
import { PremiumPricingGrid } from "@/components/PremiumPricingGrid";
import { useDynamicPlans } from "@/hooks/useDynamicPlans";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Send, Copy, CheckCircle2, Zap, Globe2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import CardPayOption from "@/components/CardPayOption";
import PixCountdown from "@/components/PixCountdown";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { trackInitiateCheckout } from "@/lib/tiktok-pixel";

import { getUtmParams } from "@/lib/utm";
import { getPedidoStatus } from "@/lib/admin.functions";
import { getSandboxEnabled } from "@/lib/sandbox.functions";
import { DelayedCouponField, getAppliedCoupon } from "@/components/CouponField";
import ogTrafego from "@/assets/og-trafego.jpg";
import { BrandHeader } from "@/components/BrandHeader";

const NEON = "#B026FF";
const BG = "#0a0a0a";

export const Route = createFileRoute("/trafego")({
  head: () => {
    const title = "Tráfego Web Real Segmentado via Pix — Elite Boost Prime | BoostGG";
    const description =
      "Contrate tráfego web real via Pix. Entrega automática, geo-segmentada e distribuição gradual.";
    const url = "https://boostgg.com.br/trafego";
    const ogImage = `https://boostgg.com.br${ogTrafego}?v=48`;
    return {
      meta: [
        { title }, { name: "description", content: description },
        { property: "og:title", content: title }, { property: "og:description", content: description },
        { property: "og:url", content: url }, { property: "og:type", content: "website" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title }, { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [buildProductJsonLd({ network: "Tráfego Pago", url, description }), buildFaqJsonLd(FAQS["trafego"])],
    };
  },
  component: TrafegoLanding,
});

type Categoria = "brasil" | "mundial";
type Plan = { id: string; tier: string; quantidade: number; valor: number; price: string; highlight?: boolean };

// v307 — Faxina: preço vem SÓ do banco (Autoridade Única).
const brPlans: Plan[] = [];
const glPlans: Plan[] = [];



const urlSchema = z.object({
  plan: z.string().min(1),
  profile: z.string().trim()
    .min(8, "Cole a URL completa do site")
    .max(500, "Máximo 500 caracteres")
    .regex(/^https?:\/\//i, "Por favor, insira o link completo do perfil, vídeo ou publicação."),
});

type PedidoInfo = { price: string; tier: string; profile: string; pixCode: string; qrCodeBase64: string; pedidoId: string | null; quantidade: number };

function TrafegoLanding() {
  const [categoria, setCategoria] = useState<Categoria>("brasil");
  const [planId, setPlanId] = useState("");
  const [profile, setProfile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const getSandboxFn = useServerFn(getSandboxEnabled);
  const blockedMap = useBlockedMap();
  const trType = categoria === "brasil" ? "br" : "global";
  const tipoBloqueado = isBlocked(blockedMap, "trafego", trType);

  const [rejected, setRejected] = useState(false);
  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid || rejected) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      cancelled = true;
      if (interval) { clearInterval(interval); interval = null; }
    };
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await getStatusFn({ data: { id } });
        if (cancelled || !res.ok) return;
        if (res.status === "paid" || res.status === "Enviado" || res.status === "waiting_provision") { stop(); setPaid(true); playSuccessAudio(); return; }
        if (res.status === "mp_rejected_insufficient") { stop(); setRejected(true); toast.error("❌ Pagamento recusado: saldo insuficiente no banco emissor."); return; }
        if (res.status === "mp_refunded" || res.status === "SMM_FAILED") { stop(); setRejected(true); toast.error("❌ Instabilidade temporária de envio. Para sua segurança, seu pagamento foi ESTORNADO AUTOMATICAMENTE para a sua conta bancária em tempo real! Por favor, verifique seu extrato e tente novamente em alguns instantes.", { duration: 15000 }); return; }
        if (typeof res.status === "string" && res.status.startsWith("mp_")) { stop(); setRejected(true); toast.error("❌ Pagamento recusado pelo Mercado Pago."); return; }
      } catch {}
    };
    tick();
    interval = setInterval(tick, 1000);
    const hardStop = setTimeout(stop, 180_000); // v104 anti-loop 3min
    return () => { stop(); clearTimeout(hardStop); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, rejected, getStatusFn]);

  // Redirect para /obrigado quando pagamento confirmado (dispara pixel de conversão)
  useEffect(() => {
    if (!paid || !pedidoInfo?.pedidoId) return;
    const t = setTimeout(() => {
      const valorNum = pedidoInfo?.price ? Number(String(pedidoInfo.price).replace(/[^\d,]/g, "").replace(",", ".")) : "";
      const q = new URLSearchParams({
        order: String(pedidoInfo.pedidoId),
        value: String(valorNum ?? ""),
        tier: String((pedidoInfo as { tier?: string })?.tier ?? "trafego"),
      }).toString();
      window.location.assign(`/obrigado?${q}`);
    }, 2500);
    return () => clearTimeout(t);
  }, [paid, pedidoInfo?.pedidoId, pedidoInfo?.price]);

  const dyn = useDynamicPlans({
    brasil:  { category: "trafego:br",     fallback: brPlans, unitLabel: "Visitas" },
    mundial: { category: "trafego:global", fallback: glPlans, unitLabel: "Visitas" },
  });
  // v335 — Prateleira honesta: aba só existe se houver pacote vendável nela.
  const abas = [
    dyn.brasil.length > 0 ? { key: "brasil", label: "Brasil", emoji: "🇧🇷", badge: "🔥 Mais Popular", badgeColor: "#39ff14" } : null,
    dyn.mundial.length > 0 ? { key: "mundial", label: "Mundial", emoji: "🌎", badge: "Em Alta", badgeColor: "#fe0979" } : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null);
  useEffect(() => {
    if (abas.length === 0) return;
    if (!abas.some((a) => a.key === categoria)) setCategoria(abas[0].key as Categoria);
  }, [abas, categoria]);
  const currentPlans = categoria === "brasil" ? dyn.brasil : dyn.mundial;
  const dynAllPlans = [...dyn.brasil, ...dyn.mundial];

  const submit = async (selected: Plan) => {
    const parsed = urlSchema.safeParse({ plan: selected.id, profile });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (checkoutEmailError(email)) { toast.error(checkoutEmailError(email)!); return; }

    // Sandbox Mode — flag global em admin_settings (server-only; nunca exposto publicamente)
    const sb = await getSandboxFn().catch(() => ({ enabled: false }));
    if (sb.enabled) {
      setPaid(false);
      setPedidoInfo({
        price: selected.price, tier: selected.tier, profile: parsed.data.profile,
        pixCode: "00020126[SANDBOX-MOCK-NO-CHARGE]", qrCodeBase64: "", pedidoId: null,
        quantidade: selected.quantidade,
      });
      setModalOpen(true);
      setTimeout(() => setPaid(true), 2000);
      return;
    }

    setPlanId(selected.id);
    setLoading(true);
    try {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("eliteboost:upsell-intent"));
      const res = await criarPedidoFn({
        data: {
          instagram_user: parsed.data.profile, pacote: selected.id,
          quantidade: selected.quantidade, valor: selected.valor,
          email: (normalizeCheckoutEmail(email) ?? ""), rede_social: "trafego", ...getUtmParams(),
          cupom: getAppliedCoupon(),
        },
      });
      if (!res?.ok) { toast.error("Não foi possível gerar o Pix."); return; }
      trackInitiateCheckout({
        orderId: res.pedidoId ?? "",
        value: selected.valor,
        contentId: selected.id,
        contentName: `${selected.tier} trafego`,
      });
      setPaid(false);

      const finalPlan = res.pacoteFinal ? dynAllPlans.find((p) => p.id === res.pacoteFinal) : undefined;
      setPedidoInfo({
        price: res.valorFormatado ?? finalPlan?.price ?? selected.price,
        tier: finalPlan?.tier ?? selected.tier,
        profile: parsed.data.profile,
        pixCode: res.qrCode, qrCodeBase64: res.qrCodeBase64, pedidoId: res.pedidoId,
        quantidade: finalPlan?.quantidade ?? selected.quantidade,
      });
      setModalOpen(true);
    } catch { toast.error("Erro ao registrar pedido."); }
    finally { setLoading(false); }
  };

  const copyPix = async () => {
    if (!pedidoInfo) return;
    try { await navigator.clipboard.writeText(pedidoInfo.pixCode); toast.success("Código Pix copiado!"); }
    catch { toast.error("Não foi possível copiar."); }
  };

  const qrCodeUrl = pedidoInfo?.qrCodeBase64 ? `data:image/png;base64,${pedidoInfo.qrCodeBase64}` : "";

  return (
    <MobileFrame bg={BG} route="/trafego">
      <PlansShowcaseProvider accent={NEON}>
      <header className="sticky top-0 z-50 bg-black/90 border-b transition-all duration-300" style={{ borderColor: `${NEON}66` }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandHeader subtitle="Tráfego Web Real Brasil e Global via Pix" />
          </div>
          <ShowcaseTrigger />
        </div>
      </header>
      <h1 className="text-center text-2xl sm:text-3xl font-bold text-white mt-4 mb-2 px-4">
        Tráfego Web Real Segmentado
      </h1>
      <ShowcaseShell>
      {abas.length > 1 && (
        <PremiumCategorySelector
          accent={NEON}
          active={categoria}
          onChange={(k) => { setCategoria(k as Categoria); setPlanId(""); setProfile(""); }}
          items={abas}
        />
      )}

      <div data-avatar-proof-row className="relative z-50 mx-auto mt-1 mb-2 flex w-full max-w-[550px] items-center justify-between gap-2 px-2 sm:px-3">
        <FabianoBadge variant="trafego" inline />
        <SocialProofPopup route="/trafego" />
        <JarvisBadge variant="trafego" inline />
      </div>
      <PremiumPricingGrid
        accent={NEON}
        disabled={tipoBloqueado}
        disabledLabel="⚠️ Em manutenção"
        unit="Visitas"
        plans={currentPlans.map((p, i) => ({
          id: p.id,
          qty: p.quantidade.toLocaleString("pt-BR"),
          price: p.price,
          fire: p.highlight === true || i === 1,
        }))}
        onBuy={(id) => { setPlanId(id); document.getElementById("tw-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
      />

      {planId && (<section id="tw-pedido" className="py-12 border-y" style={{ borderColor: `${NEON}44`, background: "#0d0d0e" }}>
        <div className="container mx-auto px-4 sm:px-6 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Finalizar pedido</h2>
          <p className="mt-2 text-center text-sm text-zinc-400">Cole a URL completa do seu site ou landing page.</p>
          <div className="mt-6 rounded-2xl p-4 space-y-3" style={{ background: BG, border: `1px solid ${NEON}66`, boxShadow: `0 0 30px ${NEON}33` }}>
            <div className="space-y-2">
              <Label>Pacote</Label>
              <div className="grid grid-cols-1 gap-2">
                {currentPlans.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPlanId(p.id)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all"
                    style={planId === p.id
                      ? { background: `${NEON}22`, border: `1px solid ${NEON}`, color: "#fff", boxShadow: `0 0 18px ${NEON}66` }
                      : { background: "#111", border: "1px solid #222", color: "#d4d4d8" }}>
                    <span>{p.tier}</span><span style={{ color: NEON }}>{p.price}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tw-url">URL do site</Label>
              <Input id="tw-url" value={profile} onChange={(e) => setProfile(e.target.value)}
                placeholder="https://seusite.com.br/landing"
                className="h-12" style={{ background: "#111", borderColor: `${NEON}66`, color: "#fff" }} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tw-email">E-mail para comprovante e status <span className="text-zinc-500 text-xs">(obrigatório)</span></Label>
              <Input id="tw-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="h-12" style={{ background: "#111", borderColor: `${NEON}66`, color: "#fff" }}
                maxLength={200} autoComplete="email" inputMode="email" />
            </div>
            <DelayedCouponField accent={NEON} />
            <Button type="button" size="lg" disabled={loading || !planId || tipoBloqueado}
              onClick={() => { const sel = dynAllPlans.find((p) => p.id === planId); if (!sel) { toast.error("Selecione um pacote."); return; } submit(sel); }}
              className="w-full h-16 text-lg sm:text-xl font-black uppercase tracking-wider border-0 sticky bottom-2 z-30"
              style={{ background: NEON, color: "#fff", boxShadow: `0 0 35px ${NEON}` }}>
              {tipoBloqueado ? "Instabilidade Temporária - Reposição de Estoque" : loading ? "Gerando Pix..." : (<>💎 PAGAR COM PIX <Send className="size-5 ml-2" /></>)}
            </Button>
            <CardPayOption
              disabled={loading || !planId || tipoBloqueado}
              valorPix={dynAllPlans.find((p) => p.id === planId)?.valor}
              buildPayload={() => {
                const sel = dynAllPlans.find((p) => p.id === planId);
                if (!sel) { toast.error("Selecione um pacote."); return null; }
                const parsed = urlSchema.safeParse({ plan: sel.id, profile });
                if (!parsed.success) { toast.error(parsed.error.issues[0].message); return null; }
                return {
                  instagram_user: parsed.data.profile,
                  pacote: sel.id,
                  quantidade: sel.quantidade,
                  valor: sel.valor,
                  email: (normalizeCheckoutEmail(email) ?? ""),
                  rede_social: "trafego" as const,
                  ...getUtmParams(),
                  cupom: getAppliedCoupon(),
                };
              }}
            />
            <p className="text-[11px] text-center text-zinc-500">Pagamento seguro via Pix · entrega automática</p>

          </div>
        </div>
      </section>)}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border-0" style={{ background: BG, border: `1px solid ${NEON}`, boxShadow: `0 0 40px ${NEON}88` }}>
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-white">{CHECKOUT_SUCCESS_TITLE}</DialogTitle>
                <DialogDescription className="text-center text-zinc-300 whitespace-pre-line">{CHECKOUT_SUCCESS_MESSAGE_CLEAN}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="size-20" style={{ color: NEON }} />
                {pedidoInfo && (
                  <div className="text-center">
                    <div className="text-xs uppercase text-zinc-400">{pedidoInfo.tier} · {pedidoInfo.profile}</div>
                    <div className="text-3xl font-extrabold mt-1" style={{ color: NEON }}>{pedidoInfo.price}</div>
                  </div>
                )}
              </div>
              <Button size="lg" className="w-full h-12 font-bold" style={{ background: NEON, color: "#fff" }} onClick={() => setModalOpen(false)}>Fechar</Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-xl text-white">Pague com Pix para liberar</DialogTitle>
                <DialogDescription className="text-center text-zinc-400">Escaneie o QR ou copie o código.</DialogDescription>
              </DialogHeader>
              {pedidoInfo && (
                <div className="space-y-4">
                  <div className="rounded-lg p-3 text-center" style={{ background: "#111", border: `1px solid ${NEON}66` }}>
                    <div className="text-xs uppercase text-zinc-400">{pedidoInfo.tier} · {pedidoInfo.profile}</div>
                    <div className="text-2xl font-extrabold mt-1" style={{ color: NEON }}>{pedidoInfo.price}</div>
                  </div>
                  {qrCodeUrl && (
                    <>
                    <PixCountdown
                      active={modalOpen && !paid && !!pedidoInfo?.pedidoId}
                      onExpire={() => { setModalOpen(false); setPedidoInfo(null); toast.error("Tempo limite de pagamento esgotado. Por favor, gere um novo pedido para garantir o seu crescimento!"); }}
                    />
                    <div className="flex justify-center">
                      <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${NEON}aa` }}>
                        <img src={qrCodeUrl} alt="QR Code Pix" className="block w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56" />
                      </div>
                    </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Pix Copia e Cola</Label>
                    <div className="rounded-lg p-3 text-xs break-all font-mono max-h-24 overflow-y-auto"
                      style={{ background: "#111", border: `1px solid ${NEON}66`, color: "#e4e4e7" }}>{pedidoInfo.pixCode}</div>
                    <Button type="button" onClick={copyPix} variant="outline" className="w-full h-11"
                      style={{ background: "#111", borderColor: NEON, color: "#fff" }}>
                      <Copy className="size-4 mr-2" /> Copiar Código
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      </ShowcaseShell>
      </PlansShowcaseProvider>
          <FaqSection network="trafego" />
      </MobileFrame>
  );
}
