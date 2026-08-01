import { buildProductJsonLd, buildFaqJsonLd } from "@/lib/seo-jsonld";
import { checkoutErrorMessage } from "@/lib/checkout-messages";
import { FaqSection, FAQS } from "@/components/FaqSection";
import { CHECKOUT_SUCCESS_TITLE, getCheckoutSuccessMessage } from "@/lib/checkout-messages";
import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { MysteryBoxRedeem } from "@/components/MysteryBoxRedeem";
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
import { Eye, Send, Copy, CheckCircle2, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import CardPayOption from "@/components/CardPayOption";
import PixCountdown from "@/components/PixCountdown";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { trackInitiateCheckout } from "@/lib/tiktok-pixel";

import { OrderBumpDialog, findUpgrade } from "@/components/OrderBumpDialog";
import { getUtmParams } from "@/lib/utm";
import { getPedidoStatus } from "@/lib/admin.functions";
import { DelayedCouponField, getAppliedCoupon } from "@/components/CouponField";
import ogYoutube from "@/assets/og-youtube.jpg";
import { BrandHeader } from "@/components/BrandHeader";
import { normalizeCheckoutEmail, checkoutEmailError } from "@/lib/checkout-email";

export const Route = createFileRoute("/youtube")({
  head: () => {
    const title = "Comprar Inscritos e Views no YouTube via Pix | BoostGG";
    const description =
      "Cresça no YouTube com inscritos, views e likes via Pix. Acelera monetização, entrega acompanhada e sem pedir sua senha.";
    const url = "https://www.boostgg.com.br/youtube";
    const ogImage = `https://www.boostgg.com.br${ogYoutube}?v=48`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [buildProductJsonLd({ network: "YouTube", url, description }), buildFaqJsonLd(FAQS["youtube"])],
    };
  },
  component: YoutubeLanding,
});

type Categoria = "inscritos" | "visualizacoes";
type Plan = { id: string; tier: string; quantidade: number; valor: number; price: string; highlight?: boolean };

// v307 — Faxina: preço vem SÓ do banco (Autoridade Única). Sem fallback
// estático: se o banco não responder, a vitrine mostra carregamento, nunca
// preço inventado.
const subsPlans: Plan[] = [];
const viewsPlans: Plan[] = [];



const channelSchema = z.object({
  plan: z.string().min(1),
  profile: z
    .string()
    .trim()
    .min(10, "Cole o link completo do canal do YouTube")
    .max(300, "Máximo 300 caracteres")
    .regex(/^https?:\/\//i, "Por favor, insira o link completo do perfil, vídeo ou publicação.")
    .regex(/(youtube\.com|youtu\.be)\//i, "Link inválido — use a URL do canal do YouTube"),
});

const videoSchema = z.object({
  plan: z.string().min(1),
  profile: z
    .string()
    .trim()
    .min(10, "Cole o link completo do vídeo do YouTube")
    .max(300, "Máximo 300 caracteres")
    .regex(/^https?:\/\//i, "Por favor, insira o link completo do perfil, vídeo ou publicação.")
    .regex(/(youtube\.com|youtu\.be)\//i, "Link inválido — use a URL do vídeo do YouTube"),
});

type PedidoInfo = {
  price: string;
  tier: string;
  profile: string;
  pixCode: string;
  qrCodeBase64: string;
  pedidoId: string | null;
  quantidade: number;
};

const RED = "#FF0000";
const BG = "#0a0a0a";

function YouTubeIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <path fill="#FF0000" d="M44.5 14.5c-.5-2-2.1-3.6-4.1-4.1C36.8 9.5 24 9.5 24 9.5s-12.8 0-16.4.9c-2 .5-3.6 2.1-4.1 4.1C2.6 18.1 2.6 24 2.6 24s0 5.9.9 9.5c.5 2 2.1 3.6 4.1 4.1 3.6.9 16.4.9 16.4.9s12.8 0 16.4-.9c2-.5 3.6-2.1 4.1-4.1.9-3.6.9-9.5.9-9.5s0-5.9-.9-9.5z"/>
      <path fill="#fff" d="M19.5 31.5l11-7.5-11-7.5z"/>
    </svg>
  );
}

function YoutubeLanding() {
  const [categoria, setCategoria] = useState<Categoria>("inscritos");
  const [planId, setPlanId] = useState<string>("");
  const [profile, setProfile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const [bumpOpen, setBumpOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ plan: Plan; profile: string } | null>(null);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blockedMap = useBlockedMap();
  const ytType = categoria === "inscritos" ? "followers" : "views";
  const tipoBloqueado = isBlocked(blockedMap, "youtube", ytType);

  const [rejected, setRejected] = useState(false);
  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid || rejected) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const stop = () => { cancelled = true; if (interval) { clearInterval(interval); interval = null; } };
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await getStatusFn({ data: { id } });
        if (cancelled || !res.ok) return;
        if (res.status === "paid" || res.status === "Enviado" || res.status === "waiting_provision") { stop(); setPaid(true); playSuccessAudio(); return; }
        if (res.status === "mp_rejected_insufficient") { stop(); setRejected(true); toast.error("❌ Pagamento recusado: saldo insuficiente no banco emissor."); return; }
        if (res.status === "mp_refunded" || res.status === "SMM_FAILED") { stop(); setRejected(true); toast.error("❌ Instabilidade temporária de envio. Para sua segurança, seu pagamento foi ESTORNADO AUTOMATICAMENTE para a sua conta bancária em tempo real! Por favor, verifique seu extrato e tente novamente em alguns instantes.", { duration: 15000 }); return; }
        if (typeof res.status === "string" && res.status.startsWith("mp_")) { stop(); setRejected(true); toast.error("❌ Pagamento recusado pelo Mercado Pago."); return; }
      } catch (err) { console.error("[yt poll]", err); }
    };
    tick();
    interval = setInterval(tick, 1000);
    const hardStop = setTimeout(stop, 180_000); // v104 anti-loop 3min
    return () => { stop(); clearTimeout(hardStop); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, rejected, getStatusFn]);

  const dyn = useDynamicPlans({
    inscritos:     { category: "youtube:inscritos",     fallback: subsPlans,  unitLabel: "Inscritos" },
    visualizacoes: { category: "youtube:visualizacoes", fallback: viewsPlans, unitLabel: "Views" },
  });
  const currentPlans = categoria === "inscritos" ? dyn.inscritos : dyn.visualizacoes;
  const dynAllPlans = [...dyn.inscritos, ...dyn.visualizacoes];
  const isSubs = categoria === "inscritos";

  const dispatchPedido = async (selected: Plan, profileValue: string, bumpUpgrade: boolean) => {
    setPlanId(selected.id);
    setLoading(true);
    try {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("eliteboost:upsell-intent"));
      const res = await criarPedidoFn({
        data: {
          instagram_user: profileValue,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: (normalizeCheckoutEmail(email) ?? ""),
          rede_social: "youtube",
          bump_upgrade: bumpUpgrade,
          ...getUtmParams(),
          cupom: getAppliedCoupon(),
        },
      });
      if (!res?.ok) {
        toast.error(checkoutErrorMessage(res?.error));
        return;
      }
      trackInitiateCheckout({
        orderId: res.pedidoId ?? "",
        value: selected.valor,
        contentId: selected.id,
        contentName: `${selected.tier} youtube`,
      });
      setPaid(false);

      const finalPlan = res.pacoteFinal ? dynAllPlans.find((p) => p.id === res.pacoteFinal) : undefined;
      setPedidoInfo({
        price: res.valorFormatado ?? selected.price,
        tier: finalPlan?.tier ?? selected.tier,
        profile: profileValue,
        pixCode: res.qrCode,
        qrCodeBase64: res.qrCodeBase64,
        pedidoId: res.pedidoId,
        quantidade: res.quantidadeFinal ?? selected.quantidade,
      });
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar pedido.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (selected: Plan) => {
    const schema = selected.id.startsWith("ys") ? channelSchema : videoSchema;
    const parsed = schema.safeParse({ plan: selected.id, profile });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (checkoutEmailError(email)) {
      toast.error(checkoutEmailError(email)!);
      return;
    }
    const upgrade = findUpgrade(selected, currentPlans);
    if (upgrade) {
      setPendingOrder({ plan: selected, profile: parsed.data.profile });
      setBumpOpen(true);
      return;
    }
    await dispatchPedido(selected, parsed.data.profile, false);
  };

  const handleBumpAccept = async () => {
    if (!pendingOrder) return;
    setBumpOpen(false);
    await dispatchPedido(pendingOrder.plan, pendingOrder.profile, true);
    setPendingOrder(null);
  };

  const handleBumpDecline = async () => {
    if (!pendingOrder) return;
    setBumpOpen(false);
    await dispatchPedido(pendingOrder.plan, pendingOrder.profile, false);
    setPendingOrder(null);
  };

  const copyPix = async () => {
    if (!pedidoInfo) return;
    try {
      await navigator.clipboard.writeText(pedidoInfo.pixCode);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const qrCodeUrl = pedidoInfo?.qrCodeBase64 ? `data:image/png;base64,${pedidoInfo.qrCodeBase64}` : "";

  return (
    // v2: solid bg, no glitch
    <MobileFrame bg="#0a0a0a" route="/youtube">
      <PlansShowcaseProvider accent={RED}>
      <header className="sticky top-0 z-50 bg-black/90 border-b transition-all duration-300" style={{ borderColor: `${RED}66` }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandHeader subtitle="Inscritos e Views no YouTube via Pix" />
          </div>
          <ShowcaseTrigger />
        </div>
      </header>
      <h1 className="text-center text-2xl sm:text-3xl font-bold text-white mt-4 mb-2 px-4">
        Crescer no YouTube — Inscritos, Curtidas e Views
      </h1>
      <ShowcaseShell>
      {/* v115 — Mystery Box Banner (>200) */}
      <div className="mx-2 mt-2 mb-1">
        <div className="rounded-xl p-3 text-center" style={{ background: `${RED}22`, border: `2px dashed ${RED}`, boxShadow: `0 0 18px ${RED}55` }}>
          <p className="text-white font-black leading-tight" style={{ fontSize: "13px" }}>
            🎁 <span style={{ color: RED }}>BÔNUS ESPECIAL!</span> Compras acima de <span style={{ color: RED }}>200 unidades</span> ganham
            <br />
            <span style={{ color: "#39ff14" }}>+10 a +50 extras</span> — resgate após o Pix aprovado.
          </p>
        </div>
      </div>
      <PremiumCategorySelector
        accent={RED}
        active={categoria}
        onChange={(k) => { setCategoria(k as Categoria); setPlanId(""); setProfile(""); }}
        items={[
          { key: "inscritos",     label: "Inscritos",     emoji: "📺", badge: "🔥 Mais Popular", badgeColor: "#39ff14" },
          { key: "_likes",        label: "Curtidas",      emoji: "❤️", badge: "Em Alta",          badgeColor: "#fe0979" },
          { key: "visualizacoes", label: "Visualizações", emoji: "🎬", badge: "Recomendado",      badgeColor: RED },
        ]}
      />
      <div data-avatar-proof-row className="relative z-50 mx-auto mt-1 mb-2 flex w-full max-w-[550px] items-center justify-between gap-2 px-2 sm:px-3">
        <FabianoBadge variant="youtube" inline />
        <SocialProofPopup route="/youtube" />
        <JarvisBadge variant="youtube" inline />
      </div>
      <PremiumPricingGrid
        accent={RED}
        disabled={tipoBloqueado}
        disabledLabel="⚠️ Em manutenção"
        unit={isSubs ? "Inscritos" : "Visualizações"}
        plans={currentPlans.map((p, i) => ({
          id: p.id,
          qty: p.quantidade.toLocaleString("pt-BR"),
          price: p.price,
          fire: p.highlight === true || i === 1,
        }))}
        onBuy={(id) => { setPlanId(id); document.getElementById("yt-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
      />

      {/* FORM */}
      {planId && (<section
        id="yt-pedido"
        className="py-12 border-y"
        style={{ borderColor: `${RED}44`, background: "#0d0d0e" }}
      >
        <div className="container mx-auto px-4 sm:px-6 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Finalizar pedido</h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            {isSubs ? "Cole o link do canal do YouTube." : "Cole o link do vídeo do YouTube."}
          </p>

          <div
            className="mt-6 rounded-2xl p-4 space-y-3"
            style={{
              background: BG,
              border: `1px solid ${RED}66`,
              boxShadow: `0 0 30px ${RED}33`,
            }}
          >
            <div className="space-y-2">
              <Label>Pacote</Label>
              <div className="grid grid-cols-1 gap-2">
                {currentPlans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanId(p.id)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all"
                    style={
                      planId === p.id
                        ? {
                            background: `${RED}22`,
                            border: `1px solid ${RED}`,
                            color: "#fff",
                            boxShadow: `0 0 18px ${RED}66`,
                          }
                        : { background: "#111", border: "1px solid #222", color: "#d4d4d8" }
                    }
                  >
                    <span>{p.tier}</span>
                    <span style={{ color: RED }}>{p.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yt-profile">
                {isSubs ? "Link do canal do YouTube" : "Link do vídeo do YouTube"}
              </Label>
              <Input
                id="yt-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder={isSubs ? "https://youtube.com/@seucanal" : "https://youtube.com/watch?v=..."}
                className="h-12"
                style={{ background: "#111", borderColor: `${RED}66`, color: "#fff" }}
                maxLength={300}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yt-email">E-mail para comprovante e status <span className="text-zinc-500 text-xs">(obrigatório)</span></Label>
              <Input
                id="yt-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="h-12"
                style={{ background: "#111", borderColor: `${RED}66`, color: "#fff" }}
                maxLength={200}
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <DelayedCouponField accent="#FF0000" />

            <Button
              type="button"
              size="lg"
              disabled={loading || !planId || tipoBloqueado}
              onClick={() => {
                const sel = dynAllPlans.find((p) => p.id === planId);
                if (!sel) { toast.error("Selecione um pacote."); return; }
                submit(sel);
              }}
              className="w-full h-16 text-lg sm:text-xl font-black uppercase tracking-wider border-0 sticky bottom-2 z-30"
              style={{
                background: RED,
                color: "#fff",
                boxShadow: `0 0 35px ${RED}`,
              }}
            >
              {tipoBloqueado ? "⚠️ Indisponível Temporariamente (Manutenção do Servidor)" : loading ? "Gerando Pix..." : (<>💎 PAGAR COM PIX <Send className="size-5 ml-2" /></>)}
            </Button>
            <CardPayOption
              disabled={loading || !planId || tipoBloqueado}
              valorPix={dynAllPlans.find((p) => p.id === planId)?.valor}
              buildPayload={() => {
                const sel = dynAllPlans.find((p) => p.id === planId);
                if (!sel) { toast.error("Selecione um pacote."); return null; }
                const sch = sel.id.startsWith("ys") ? channelSchema : videoSchema;
                const parsed = sch.safeParse({ plan: sel.id, profile });
                if (!parsed.success) { toast.error(parsed.error.issues[0].message); return null; }
                if (checkoutEmailError(email)) { toast.error(checkoutEmailError(email)!); return null; }
                return {
                  instagram_user: parsed.data.profile,
                  pacote: sel.id,
                  quantidade: sel.quantidade,
                  valor: sel.valor,
                  email: (normalizeCheckoutEmail(email) ?? ""),
                  rede_social: "youtube" as const,
                  ...getUtmParams(),
                  cupom: getAppliedCoupon(),
                };
              }}
            />
            <p className="text-[11px] text-center text-zinc-500">
              Pagamento seguro via Pix · sem senha · entrega automática

            </p>
          </div>
        </div>
      </section>)}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-w-md border-0"
          style={{ background: BG, border: `1px solid ${RED}`, boxShadow: `0 0 40px ${RED}88` }}
        >
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-white">
                  {CHECKOUT_SUCCESS_TITLE}
                </DialogTitle>
                <DialogDescription className="text-center text-zinc-300 whitespace-pre-line">
                  {getCheckoutSuccessMessage(pedidoInfo?.quantidade)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="size-20" style={{ color: RED }} />
                {pedidoInfo && (
                  <div className="text-center">
                    <div className="text-xs uppercase text-zinc-400">
                      {pedidoInfo.tier} · {pedidoInfo.profile}
                    </div>
                    <div className="text-3xl font-extrabold mt-1" style={{ color: RED }}>
                      {pedidoInfo.price}
                    </div>
                  </div>
                )}
              </div>
              {pedidoInfo?.pedidoId && (
                <MysteryBoxRedeem
                  pedidoId={pedidoInfo.pedidoId}
                  quantidade={pedidoInfo.quantidade}
                  unit={categoria === "inscritos" ? "inscritos" : "views"}
                  accent={RED}
                />
              )}
              <Button
                size="lg"
                className="w-full h-12 font-bold"
                style={{ background: RED, color: "#fff" }}
                onClick={() => setModalOpen(false)}
              >
                Fechar
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-xl text-white">
                  Pague com Pix para liberar
                </DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  Escaneie o QR ou copie o código. A entrega inicia ao confirmar.
                </DialogDescription>
              </DialogHeader>
              {pedidoInfo && (
                <div className="space-y-4">
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: "#111", border: `1px solid ${RED}66` }}
                  >
                    <div className="text-xs uppercase text-zinc-400">
                      {pedidoInfo.tier} · {pedidoInfo.profile}
                    </div>
                    <div className="text-2xl font-extrabold mt-1" style={{ color: RED }}>
                      {pedidoInfo.price}
                    </div>
                  </div>
                  <PixCountdown
                      active={modalOpen && !paid && !!pedidoInfo?.pedidoId}
                      onExpire={() => { setModalOpen(false); setPedidoInfo(null); toast.error("Tempo limite de pagamento esgotado. Por favor, gere um novo pedido para garantir o seu crescimento!"); }}
                    />
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${RED}aa` }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" className="block w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Pix Copia e Cola</Label>
                    <div
                      className="rounded-lg p-3 text-xs break-all font-mono max-h-24 overflow-y-auto"
                      style={{ background: "#111", border: `1px solid ${RED}66`, color: "#e4e4e7" }}
                    >
                      {pedidoInfo.pixCode}
                    </div>
                    <Button
                      type="button"
                      onClick={copyPix}
                      variant="outline"
                      className="w-full h-11"
                      style={{ background: "#111", borderColor: RED, color: "#fff" }}
                    >
                      <Copy className="size-4 mr-2" /> Copiar Código
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <OrderBumpDialog
        open={bumpOpen}
        current={pendingOrder?.plan ?? null}
        allPlans={currentPlans}
        unitLabel={categoria === "inscritos" ? "Inscritos" : "Views"}
        onAccept={handleBumpAccept}
        onDecline={handleBumpDecline}
        loading={loading}
      />
      </ShowcaseShell>
      </PlansShowcaseProvider>
          <FaqSection network="youtube" />
      </MobileFrame>
  );
}
