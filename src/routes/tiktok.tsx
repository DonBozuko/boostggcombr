import { buildProductJsonLd, buildFaqJsonLd } from "@/lib/seo-jsonld";
import { FaqSection, FAQS } from "@/components/FaqSection";
import { applyProfitFormula, buildPlans } from "@/lib/profit-markup";
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
import { getBrPricingGrid } from "@/lib/pricing.functions";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Music2, Heart, Eye, Send, Copy, CheckCircle2, Zap } from "lucide-react";
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
import PixCountdown from "@/components/PixCountdown";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { trackInitiateCheckout } from "@/lib/tiktok-pixel";

import { getUtmParams } from "@/lib/utm";
import { getPedidoStatus } from "@/lib/admin.functions";
import { DelayedCouponField, getAppliedCoupon } from "@/components/CouponField";
import ogTiktok from "@/assets/og-tiktok.jpg";
import { BrandHeader } from "@/components/BrandHeader";
import { OrderBumpDialog, findUpgrade } from "@/components/OrderBumpDialog";

export const Route = createFileRoute("/tiktok")({
  head: () => {
    const title = "Comprar Seguidores TikTok Barato | EliteBoost Prime";
    const description =
      "Compre seguidores, curtidas e views de TikTok reais com entrega imediata via Pix. Alta retenção, orgânico e reposição garantida.";
    const url = "https://boostgg.com.br/tiktok";
    const ogImage = `https://boostgg.com.br${ogTiktok}?v=48`;
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
      scripts: [buildProductJsonLd({ network: "TikTok", url, description }), buildFaqJsonLd(FAQS["tiktok"])],
    };
  },
  component: TiktokLanding,
});

type Categoria = "seguidores" | "curtidas" | "visualizacoes";
type Plan = { id: string; tier: string; qty: string; quantidade: number; valor: number; price: string };

const FOLLOWER_QTYS = [100,200,300,500,750,1000,1500,2000,3000,5000,7500,10000,15000,20000,30000,50000,75000,100000];
const LIKE_QTYS = [100,200,300,500,750,1000,1500,2000,3000,5000,7500,10000,15000,20000,30000,50000,75000,100000];
const VIEW_QTYS = [1000,2000,5000,10000,15000,25000,50000,75000,100000,200000,300000,500000,750000,1000000];

const followersPlans: Plan[] = applyProfitFormula(
  buildPlans({ prefix: "tf", unitLabel: "Seguidores", costPer1k: 9, qtys: FOLLOWER_QTYS }),
);
const likesPlans: Plan[] = applyProfitFormula(
  buildPlans({ prefix: "tl", unitLabel: "Curtidas", costPer1k: 3, qtys: LIKE_QTYS }),
);
const viewsPlans: Plan[] = applyProfitFormula(
  buildPlans({ prefix: "tv", unitLabel: "Views", costPer1k: 0.4, qtys: VIEW_QTYS }),
);
const allPlans = [...followersPlans, ...likesPlans, ...viewsPlans];


const followersSchema = z.object({
  plan: z.string().min(1),
  profile: z
    .string()
    .trim()
    .min(2, "Informe o @ do perfil do TikTok")
    .max(120, "Máximo 120 caracteres")
    .regex(/^[@a-zA-Z0-9._/:-]+$/, "Use apenas o @ ou link do perfil"),
});

const videoSchema = z.object({
  plan: z.string().min(1),
  profile: z
    .string()
    .trim()
    .min(10, "Cole o link completo do vídeo do TikTok")
    .max(300, "Máximo 300 caracteres")
    .regex(/^https?:\/\//i, "Por favor, insira o link completo do perfil, vídeo ou publicação.")
    .regex(/tiktok\.com\//i, "Link inválido — use a URL do vídeo do TikTok"),
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

const CYAN = "#00f2fe";
const PINK = "#fe0979";

// Ícone oficial do TikTok (SVG inline).
function TikTokIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <path fill="#fff" d="M33.5 6.5c.5 3.4 2.4 6 5.8 7v5.1c-2.2.2-4.1-.4-6.3-1.6v10.7c0 5.5-4 9.7-9.4 9.7-5.4 0-9.4-4.2-9.4-9.4 0-5.3 4.2-9.5 9.5-9.5h.9v5.4c-.4-.1-.8-.1-1.2-.1-2.3 0-4.2 1.9-4.2 4.2 0 2.3 1.9 4.2 4.2 4.2s4.2-1.9 4.2-4.2V6.5h5.9z"/>
    </svg>
  );
}


function TiktokLanding() {
  const [categoria, setCategoria] = useState<Categoria>("seguidores");
  const [planId, setPlanId] = useState<string>("");
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const [bumpOpen, setBumpOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ plan: Plan; profile: string } | null>(null);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blockedMap = useBlockedMap();
  const ttType = categoria === "seguidores" ? "followers" : categoria === "curtidas" ? "likes" : "views";
  const tipoBloqueado = isBlocked(blockedMap, "tiktok", ttType);

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
        if (res.status === "mp_rejected_insufficient") {
          stop(); setRejected(true);
          toast.error("❌ Pagamento recusado: saldo insuficiente no banco emissor.");
          return;
        }
        if (res.status === "mp_refunded" || res.status === "SMM_FAILED") {
          stop(); setRejected(true);
          toast.error("❌ Instabilidade temporária de envio. Para sua segurança, seu pagamento foi ESTORNADO AUTOMATICAMENTE para a sua conta bancária em tempo real! Por favor, verifique seu extrato e tente novamente em alguns instantes.", { duration: 15000 });
          return;
        }
        if (typeof res.status === "string" && res.status.startsWith("mp_")) {
          stop(); setRejected(true);
          toast.error("❌ Pagamento recusado pelo Mercado Pago.");
          return;
        }
      } catch (err) {
        console.error("[tt poll]", err);
      }
    };
    tick();
    interval = setInterval(tick, 1000);
    const hardStop = setTimeout(stop, 180_000); // v104 anti-loop 3min
    return () => { stop(); clearTimeout(hardStop); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, rejected, getStatusFn]);

  const dyn = useDynamicPlans({
    seguidores:    { category: "tiktok:seguidores",    fallback: followersPlans, unitLabel: "Seguidores" },
    curtidas:      { category: "tiktok:curtidas",      fallback: likesPlans,     unitLabel: "Curtidas" },
    visualizacoes: { category: "tiktok:visualizacoes", fallback: viewsPlans,     unitLabel: "Views" },
  });
  const currentPlans =
    categoria === "seguidores" ? dyn.seguidores :
    categoria === "curtidas" ? dyn.curtidas : dyn.visualizacoes;
  const dynAllPlans = [...dyn.seguidores, ...dyn.curtidas, ...dyn.visualizacoes];

  const isFollowers = categoria === "seguidores";

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
          email: "cliente@tiktok.eliteboostprime.com",
          rede_social: "tiktok",
          bump_upgrade: bumpUpgrade,
          ...getUtmParams(),
          cupom: getAppliedCoupon(),
        },
      });
      if (!res?.ok) {
        toast.error("Não foi possível gerar o Pix. Tente novamente.");
        return;
      }
      trackInitiateCheckout({
        orderId: res.pedidoId ?? "",
        value: selected.valor,
        contentId: selected.id,
        contentName: `${selected.tier} ${categoria}`,
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
    const schema = selected.id.startsWith("tf") ? followersSchema : videoSchema;
    const parsed = schema.safeParse({ plan: selected.id, profile });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    // v183 — Se existe upgrade disponível, abre bump antes do Pix. Senão dispara direto.
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
    <MobileFrame bg="#0a0a0a" route="/tiktok">
      <PlansShowcaseProvider accent={CYAN}>
      <header className="sticky top-0 z-50 bg-black/90 border-b transition-all duration-300" style={{ borderColor: `${CYAN}66` }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandHeader subtitle="Seguidores Reais no TikTok via Pix" />
          </div>
          <ShowcaseTrigger />
        </div>
      </header>
      <ShowcaseShell>
      {/* v115 — Mystery Box Banner (>200) */}
      <div className="mx-2 mt-2 mb-1">
        <div className="rounded-xl p-3 text-center" style={{ background: `linear-gradient(135deg, ${CYAN}22 0%, ${PINK}22 100%)`, border: `2px dashed ${CYAN}`, boxShadow: `0 0 18px ${CYAN}55` }}>
          <p className="text-white font-black leading-tight" style={{ fontSize: "13px" }}>
            🎁 <span style={{ color: CYAN }}>BÔNUS ESPECIAL!</span> Compras acima de <span style={{ color: PINK }}>200 unidades</span> ganham
            <br />
            <span style={{ color: "#39ff14" }}>+10 a +50 extras</span> — resgate após o Pix aprovado.
          </p>
        </div>
      </div>
      <PremiumCategorySelector
        accent={CYAN}
        active={categoria}
        onChange={(k) => { setCategoria(k as Categoria); setPlanId(""); setProfile(""); }}
        items={[
          { key: "seguidores",    label: "Seguidores",    emoji: "🎵", badge: "🔥 Mais Popular", badgeColor: "#39ff14" },
          { key: "curtidas",      label: "Curtidas",      emoji: "❤️", badge: "Em Alta",          badgeColor: PINK },
          { key: "visualizacoes", label: "Visualizações", emoji: "🎬", badge: "Recomendado",      badgeColor: CYAN },
        ]}
      />
      <div data-avatar-proof-row className="relative z-50 mx-auto mt-1 mb-2 flex w-full max-w-[550px] items-center justify-between gap-2 px-2 sm:px-3">
        <FabianoBadge variant="tiktok" inline />
        <SocialProofPopup route="/tiktok" />
        <JarvisBadge variant="tiktok" inline />
      </div>
      <PremiumPricingGrid
        accent={CYAN}
        disabled={tipoBloqueado}
        disabledLabel="⚠️ Em manutenção"
        unit={categoria === "seguidores" ? "Seguidores" : categoria === "curtidas" ? "Curtidas" : "Visualizações"}
        plans={currentPlans.map((p, i) => ({
          id: p.id,
          qty: p.quantidade.toLocaleString("pt-BR"),
          price: p.price,
          fire: i === 1,
        }))}
        onBuy={(id) => { setPlanId(id); document.getElementById("tt-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
      />

      {/* FORM */}
      {planId && (<section
        id="tt-pedido"
        className="py-12 border-y"
        style={{ borderColor: `${CYAN}33`, background: "#0d0d0e" }}
      >
        <div className="container mx-auto px-4 sm:px-6 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            Finalizar pedido
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            {isFollowers ? "Informe o @ do perfil do TikTok." : "Cole o link do vídeo do TikTok."}
          </p>

          <div
            className="mt-6 rounded-2xl p-4 space-y-3"
            style={{
              background: "#0a0a0a",
              border: `1px solid ${CYAN}55`,
              boxShadow: `0 0 30px ${CYAN}22`,
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
                            background: `linear-gradient(135deg, ${CYAN}22, ${PINK}22)`,
                            border: `1px solid ${PINK}`,
                            color: "#fff",
                            boxShadow: `0 0 18px ${PINK}55`,
                          }
                        : { background: "#111", border: "1px solid #222", color: "#d4d4d8" }
                    }
                  >
                    <span>{p.tier}</span>
                    <span style={{ color: CYAN }}>{p.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tt-profile">
                {isFollowers ? "@ do perfil do TikTok" : "Link do vídeo do TikTok"}
              </Label>
              <Input
                id="tt-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder={isFollowers ? "@seuusuario" : "https://tiktok.com/@user/video/..."}
                className="h-12"
                style={{ background: "#111", borderColor: `${CYAN}55`, color: "#fff" }}
                maxLength={300}
              />
            </div>

            <DelayedCouponField accent="#00f2fe" />

            <Button
              type="button"
              size="lg"
              disabled={loading || !planId || tipoBloqueado}
              onClick={() => {
                const sel = dynAllPlans.find((p) => p.id === planId);
                if (!sel) { toast.error("Selecione um pacote."); return; }
                submit({ ...sel, qty: sel.qty ?? sel.quantidade.toLocaleString("pt-BR") });
              }}
              className="w-full h-16 text-lg sm:text-xl font-black uppercase tracking-wider border-0 sticky bottom-2 z-30"
              style={{
                background: `linear-gradient(135deg, ${CYAN}, ${PINK})`,
                color: "#0a0a0a",
                boxShadow: `0 0 35px ${PINK}, 0 0 35px ${CYAN}`,
              }}
            >
              {tipoBloqueado ? "⚠️ Indisponível Temporariamente (Manutenção do Servidor)" : loading ? "Gerando Pix..." : (<>💎 PAGAR COM PIX <Send className="size-5 ml-2" /></>)}
            </Button>
            <p className="text-[11px] text-center text-zinc-500">
              Pagamento seguro via Pix · sem senha · entrega automática
            </p>
          </div>
        </div>
      </section>)}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-w-md border-0"
          style={{ background: "#0a0a0a", border: `1px solid ${CYAN}`, boxShadow: `0 0 40px ${PINK}55` }}
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
                <CheckCircle2 className="size-20" style={{ color: CYAN }} />
                {pedidoInfo && (
                  <div className="text-center">
                    <div className="text-xs uppercase text-zinc-400">
                      {pedidoInfo.tier} · {pedidoInfo.profile}
                    </div>
                    <div className="text-3xl font-extrabold mt-1" style={{ color: PINK }}>
                      {pedidoInfo.price}
                    </div>
                  </div>
                )}
              </div>
              {pedidoInfo?.pedidoId && (
                <MysteryBoxRedeem
                  pedidoId={pedidoInfo.pedidoId}
                  quantidade={pedidoInfo.quantidade}
                  unit={categoria === "seguidores" ? "seguidores" : categoria === "curtidas" ? "curtidas" : "views"}
                  accent={CYAN}
                />
              )}
              <Button
                size="lg"
                className="w-full h-12 font-bold"
                style={{ background: `linear-gradient(135deg, ${CYAN}, ${PINK})`, color: "#0a0a0a" }}
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
                    style={{ background: "#111", border: `1px solid ${CYAN}55` }}
                  >
                    <div className="text-xs uppercase text-zinc-400">
                      {pedidoInfo.tier} · {pedidoInfo.profile}
                    </div>
                    <div className="text-2xl font-extrabold mt-1" style={{ color: CYAN }}>
                      {pedidoInfo.price}
                    </div>
                  </div>
                  <PixCountdown
                      active={modalOpen && !paid && !!pedidoInfo?.pedidoId}
                      onExpire={() => { setModalOpen(false); setPedidoInfo(null); toast.error("Tempo limite de pagamento esgotado. Por favor, gere um novo pedido para garantir o seu crescimento!"); }}
                    />
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${CYAN}88` }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" className="block w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Pix Copia e Cola</Label>
                    <div
                      className="rounded-lg p-3 text-xs break-all font-mono max-h-24 overflow-y-auto"
                      style={{ background: "#111", border: `1px solid ${PINK}55`, color: "#e4e4e7" }}
                    >
                      {pedidoInfo.pixCode}
                    </div>
                    <Button
                      type="button"
                      onClick={copyPix}
                      variant="outline"
                      className="w-full h-11"
                      style={{ background: "#111", borderColor: CYAN, color: "#fff" }}
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
        unitLabel={categoria === "seguidores" ? "Seguidores" : categoria === "curtidas" ? "Curtidas" : "Views"}
        onAccept={handleBumpAccept}
        onDecline={handleBumpDecline}
        loading={loading}
      />
      </ShowcaseShell>
      </PlansShowcaseProvider>
          <FaqSection network="tiktok" />
      </MobileFrame>
  );
}

