import { buildProductJsonLd, buildFaqJsonLd } from "@/lib/seo-jsonld";
import { FaqSection, FAQS } from "@/components/FaqSection";
import { applyProfitFormula, buildPlans } from "@/lib/profit-markup";
import { CHECKOUT_SUCCESS_TITLE, getCheckoutSuccessMessage } from "@/lib/checkout-messages";
import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { ViralShare } from "@/components/ViralShare";
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
import { Send, Copy, CheckCircle2, Zap, Users, Megaphone } from "lucide-react";
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
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { OrderBumpDialog, findUpgrade } from "@/components/OrderBumpDialog";
import { getUtmParams } from "@/lib/utm";
import { getPedidoStatus } from "@/lib/admin.functions";
import { DelayedCouponField, getAppliedCoupon } from "@/components/CouponField";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import ogTelegram from "@/assets/og-telegram.jpg";
import { BrandHeader } from "@/components/BrandHeader";

const AERO = "#00CCFF";
const BG = "#0a0a0a";

export const Route = createFileRoute("/telegram")({
  head: () => {
    const title = "Comprar Membros Telegram Grupo e Canal | EliteBoost";
    const description =
      "Compre membros reais para grupo e canal do Telegram com entrega imediata via Pix. Alta retenção e reposição garantida.";
    const url = "https://eliteboostprime.lovable.app/telegram";
    const ogImage = `https://eliteboostprime.lovable.app${ogTelegram}?v=48`;
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
      scripts: [buildProductJsonLd({ network: "Telegram", url, description }), buildFaqJsonLd(FAQS["telegram"])],
    };
  },
  component: TelegramLanding,
});

type Categoria = "canal" | "grupo";
type Plan = { id: string; tier: string; quantidade: number; valor: number; price: string };

const TG_QTYS = [100,200,300,500,750,1000,1500,2000,2500,3000,4000,5000,7500,10000,12500,15000,20000,25000,30000,40000,50000,75000,100000,150000,200000];

const canalPlans: Plan[] = applyProfitFormula(
  buildPlans({ prefix: "tgc", unitLabel: "Membros (Canal)", costPer1k: 15, qtys: TG_QTYS }),
);
const grupoPlans: Plan[] = applyProfitFormula(
  buildPlans({ prefix: "tgg", unitLabel: "Membros (Grupo)", costPer1k: 15, qtys: TG_QTYS }),
);
const allPlans = [...canalPlans, ...grupoPlans];


const linkSchema = z.object({
  plan: z.string().min(1),
  profile: z
    .string()
    .trim()
    .min(8, "Cole o link do canal ou grupo do Telegram")
    .max(300, "Máximo 300 caracteres")
    .regex(/^https?:\/\//i, "Use a URL completa do Telegram (https://t.me/...)")
    .regex(/(t\.me|telegram\.me)\//i, "Link inválido — use a URL do canal/grupo no Telegram"),
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

function TelegramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill={AERO} d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.5 3.64 12.2c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.7L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
    </svg>
  );
}

function TelegramLanding() {
  const [categoria, setCategoria] = useState<Categoria>("canal");
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
  const blocked = useBlockedMap();

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
      } catch (err) { console.error("[tg poll]", err); }
    };
    tick();
    interval = setInterval(tick, 1000);
    const hardStop = setTimeout(stop, 180_000); // v104 anti-loop 3min
    return () => { stop(); clearTimeout(hardStop); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, rejected, getStatusFn]);

  const dyn = useDynamicPlans({
    canal: { category: "telegram:canal", fallback: canalPlans, unitLabel: "Membros" },
    grupo: { category: "telegram:grupo", fallback: grupoPlans, unitLabel: "Membros" },
  });
  const currentPlans = categoria === "canal" ? dyn.canal : dyn.grupo;
  const dynAllPlans = [...dyn.canal, ...dyn.grupo];
  const tipoBloqueado = isBlocked(blocked, "telegram", categoria);


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
          email: "cliente@telegram.eliteboostprime.com",
          rede_social: "telegram",
          bump_upgrade: bumpUpgrade,
          ...getUtmParams(),
          cupom: getAppliedCoupon(),
        },
      });
      if (!res?.ok) {
        toast.error("Não foi possível gerar o Pix. Tente novamente.");
        return;
      }
      setPaid(false);
      setPedidoInfo({
        price: res.valorFormatado ?? selected.price,
        tier: selected.tier,
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
    if (isBlocked(blocked, "telegram", categoria)) {
      toast.error("Estoque em reposição. Tente novamente em instantes.");
      return;
    }
    const parsed = linkSchema.safeParse({ plan: selected.id, profile });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
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
    <MobileFrame bg={BG} route="/telegram">
      <PlansShowcaseProvider accent={AERO}>
      <header className="sticky top-0 z-50 bg-black/90 border-b transition-all duration-300" style={{ borderColor: `${AERO}66` }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandHeader subtitle="Membros Reais no Telegram via Pix" />
          </div>
          <ShowcaseTrigger />
        </div>
      </header>
      <h1 className="text-center text-2xl sm:text-3xl font-bold text-white mt-4 mb-2 px-4">
        Comprar Membros Telegram
      </h1>
      <ShowcaseShell>
      {/* v115 — Mystery Box Banner (>200) */}
      <div className="mx-2 mt-2 mb-1">
        <div className="rounded-xl p-3 text-center" style={{ background: `${AERO}22`, border: `2px dashed ${AERO}`, boxShadow: `0 0 18px ${AERO}55` }}>
          <p className="text-white font-black leading-tight" style={{ fontSize: "13px" }}>
            🎁 <span style={{ color: AERO }}>BÔNUS ESPECIAL!</span> Compras acima de <span style={{ color: AERO }}>200 unidades</span> ganham
            <br />
            <span style={{ color: "#39ff14" }}>+10 a +50 extras</span> — resgate após o Pix aprovado.
          </p>
        </div>
      </div>
      <PremiumCategorySelector
        accent={AERO}
        active={categoria}
        onChange={(k) => { setCategoria(k as Categoria); setPlanId(""); setProfile(""); }}
        items={[
          { key: "canal",  label: "Membros Canal", emoji: "📣", badge: "🔥 Mais Popular", badgeColor: "#39ff14" },
          { key: "grupo",  label: "Membros Grupo", emoji: "👥", badge: "Em Alta",          badgeColor: "#fe0979" },
          { key: "_views", label: "Views Posts",   emoji: "🎬", badge: "Recomendado",      badgeColor: AERO },
        ]}
      />
      <div data-avatar-proof-row className="relative z-50 mx-auto mt-1 mb-2 flex w-full max-w-[550px] items-center justify-between gap-2 px-2 sm:px-3">
        <FabianoBadge variant="telegram" inline />
        <SocialProofPopup route="/telegram" />
        <JarvisBadge variant="telegram" inline />
      </div>
      <PremiumPricingGrid
        accent={AERO}
        disabled={tipoBloqueado}
        disabledLabel="⚠️ Em manutenção"
        unit="Membros"
        plans={currentPlans.map((p, i) => ({
          id: p.id,
          qty: p.quantidade.toLocaleString("pt-BR"),
          price: p.price,
          fire: i === 1,
        }))}
        onBuy={(id) => { setPlanId(id); document.getElementById("tg-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
      />

      {planId && (<section id="tg-pedido" className="py-12 border-y" style={{ borderColor: `${AERO}44`, background: "#0d0d0e" }}>
        <div className="container mx-auto px-4 sm:px-6 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Finalizar pedido</h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Cole o link público do seu {categoria} no Telegram (ex: https://t.me/seucanal).
          </p>
          <div className="mt-6 rounded-2xl p-4 space-y-3"
            style={{ background: BG, border: `1px solid ${AERO}66`, boxShadow: `0 0 30px ${AERO}33` }}>
            <div className="space-y-2">
              <Label>Pacote</Label>
              <div className="grid grid-cols-1 gap-2">
                {currentPlans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanId(p.id)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all"
                    style={planId === p.id
                      ? { background: `${AERO}22`, border: `1px solid ${AERO}`, color: "#fff", boxShadow: `0 0 18px ${AERO}66` }
                      : { background: "#111", border: "1px solid #222", color: "#d4d4d8" }}
                  >
                    <span>{p.tier}</span>
                    <span style={{ color: AERO }}>{p.price}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tg-profile">Link do {categoria}</Label>
              <Input
                id="tg-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="https://t.me/seucanal"
                className="h-12"
                style={{ background: "#111", borderColor: `${AERO}66`, color: "#fff" }}
                maxLength={300}
              />
            </div>
            <DelayedCouponField accent={AERO} />
            <Button
              type="button"
              size="lg"
              disabled={loading || !planId || tipoBloqueado}
              onClick={() => {
                const sel = dynAllPlans.find((p) => p.id === planId);
                if (!sel) { toast.error("Selecione um pacote."); return; }
                submit(sel);
              }}
              className="w-full h-16 text-lg sm:text-xl font-black uppercase tracking-wider border-0 disabled:opacity-60 sticky bottom-2 z-30"
              style={tipoBloqueado
                ? { background: "#222", color: "#888" }
                : { background: AERO, color: "#000", boxShadow: `0 0 35px ${AERO}` }}
            >
              {tipoBloqueado
                ? "Instabilidade Temporária - Reposição de Estoque"
                : loading ? "Gerando Pix..." : (<>💎 PAGAR COM PIX <Send className="size-5 ml-2" /></>)}
            </Button>
            <p className="text-[11px] text-center text-zinc-500">Pagamento seguro via Pix · sem senha · entrega automática</p>
          </div>
        </div>
      </section>)}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border-0"
          style={{ background: BG, border: `1px solid ${AERO}`, boxShadow: `0 0 40px ${AERO}88` }}>
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-white">{CHECKOUT_SUCCESS_TITLE}</DialogTitle>
                <DialogDescription className="text-center text-zinc-300 whitespace-pre-line">
                  {getCheckoutSuccessMessage(pedidoInfo?.quantidade)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="size-20" style={{ color: AERO }} />
                {pedidoInfo && (
                  <div className="text-center">
                    <div className="text-xs uppercase text-zinc-400">{pedidoInfo.tier} · {pedidoInfo.profile}</div>
                    <div className="text-3xl font-extrabold mt-1" style={{ color: AERO }}>{pedidoInfo.price}</div>
                  </div>
                )}
              </div>
              {pedidoInfo?.pedidoId && (
                <MysteryBoxRedeem
                  pedidoId={pedidoInfo.pedidoId}
                  quantidade={pedidoInfo.quantidade}
                  unit={categoria === "canal" ? "membros" : "membros"}
                  accent={AERO}
                />
              )}
              <ViralShare route="/telegram" quantidade={pedidoInfo?.quantidade ?? 0} />
              <Button size="lg" className="w-full h-12 font-bold" style={{ background: AERO, color: "#000" }} onClick={() => setModalOpen(false)}>
                Fechar
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-xl text-white">Pague com Pix para liberar</DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  Escaneie o QR ou copie o código. A entrega inicia ao confirmar.
                </DialogDescription>
              </DialogHeader>
              {pedidoInfo && (
                <div className="space-y-4">
                  <div className="rounded-lg p-3 text-center" style={{ background: "#111", border: `1px solid ${AERO}66` }}>
                    <div className="text-xs uppercase text-zinc-400">{pedidoInfo.tier} · {pedidoInfo.profile}</div>
                    <div className="text-2xl font-extrabold mt-1" style={{ color: AERO }}>{pedidoInfo.price}</div>
                  </div>
                  <PixCountdown
                      active={modalOpen && !paid && !!pedidoInfo?.pedidoId}
                      onExpire={() => { setModalOpen(false); setPedidoInfo(null); toast.error("Tempo limite de pagamento esgotado. Por favor, gere um novo pedido para garantir o seu crescimento!"); }}
                    />
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${AERO}aa` }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" className="block w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Pix Copia e Cola</Label>
                    <div className="rounded-lg p-3 text-xs break-all font-mono max-h-24 overflow-y-auto"
                      style={{ background: "#111", border: `1px solid ${AERO}66`, color: "#e4e4e7" }}>
                      {pedidoInfo.pixCode}
                    </div>
                    <Button type="button" onClick={copyPix} variant="outline" className="w-full h-11"
                      style={{ background: "#111", borderColor: AERO, color: "#fff" }}>
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
          <FaqSection network="telegram" />
      </MobileFrame>
  );
}
