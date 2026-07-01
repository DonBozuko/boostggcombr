import { applyProfitFormula, buildPlans } from "@/lib/profit-markup";
import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { ViralShare } from "@/components/ViralShare";
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
import { Send, Copy, CheckCircle2, Zap, Users, ThumbsUp } from "lucide-react";
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
import { getUtmSource } from "@/lib/utm";
import { getPedidoStatus } from "@/lib/admin.functions";
import { DelayedCouponField, getAppliedCoupon } from "@/components/CouponField";
import ogFacebook from "@/assets/og-facebook.jpg";

export const Route = createFileRoute("/facebook")({
  head: () => {
    const title = "Comprar Seguidores no Facebook e Curtidas | EliteBoost Prime";
    const description =
      "Comprar seguidores no Facebook e curtidas reais com entrega via Pix automático. Pacotes para crescer perfil, página e posts rapidamente.";
    const keywords =
      "comprar seguidores facebook, comprar curtidas facebook, seguidores facebook barato, curtidas post facebook, crescer pagina facebook, agência smm facebook brasil";
    const url = "https://eliteboostprime.lovable.app/facebook";
    const ogImage = `https://eliteboostprime.lovable.app${ogFacebook}?v=48`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: keywords },
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
    };
  },
  component: FacebookLanding,
});

type Categoria = "seguidores" | "curtidas";
type Plan = { id: string; tier: string; quantidade: number; valor: number; price: string };

const FB_FOLLOWER_QTYS = [100,200,300,500,750,1000,1500,2000,2500,3000,4000,5000,7500,10000,12500,15000,20000,25000,30000,40000,50000,75000,100000,150000,200000];
const FB_LIKE_QTYS = [100,200,300,500,750,1000,1500,2000,2500,3000,4000,5000,7500,10000,12500,15000,20000,25000,30000,40000,50000,75000,100000,150000,200000];

const followersPlans: Plan[] = applyProfitFormula(
  buildPlans({ prefix: "ff", unitLabel: "Seguidores", costPer1k: 10, qtys: FB_FOLLOWER_QTYS }),
);
const likesPlans: Plan[] = applyProfitFormula(
  buildPlans({ prefix: "fl", unitLabel: "Curtidas", costPer1k: 5, qtys: FB_LIKE_QTYS }),
);
const allPlans = [...followersPlans, ...likesPlans];


const profileSchema = z.object({
  plan: z.string().min(1),
  profile: z
    .string()
    .trim()
    .min(5, "Cole o link do perfil/página do Facebook")
    .max(300, "Máximo 300 caracteres")
    .regex(/^https?:\/\//i, "Por favor, insira o link completo do perfil, vídeo ou publicação.")
    .regex(/(facebook\.com|fb\.com|fb\.watch)\//i, "Link inválido — use a URL do perfil/página do Facebook"),
});
const postSchema = z.object({
  plan: z.string().min(1),
  profile: z
    .string()
    .trim()
    .min(10, "Cole o link do post/foto do Facebook")
    .max(300, "Máximo 300 caracteres")
    .regex(/^https?:\/\//i, "Por favor, insira o link completo do perfil, vídeo ou publicação.")
    .regex(/(facebook\.com|fb\.com|fb\.watch)\//i, "Link inválido — use a URL do post/foto do Facebook"),
});

type PedidoInfo = {
  price: string;
  tier: string;
  profile: string;
  pixCode: string;
  qrCodeBase64: string;
  pedidoId: string | null;
};

const BLUE = "#1877F2";
const BG = "#0a0a0a";

function FacebookIcon({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill={BLUE} d="M24 4C12.95 4 4 12.95 4 24c0 9.97 7.3 18.23 16.85 19.76V29.78h-5.08V24h5.08v-4.4c0-5.02 2.99-7.8 7.57-7.8 2.19 0 4.49.39 4.49.39v4.94h-2.53c-2.49 0-3.27 1.55-3.27 3.14V24h5.56l-.89 5.78h-4.67v13.98C36.7 42.23 44 33.97 44 24c0-11.05-8.95-20-20-20z"/>
      <path fill="#fff" d="M29.46 29.78L30.35 24h-5.56v-3.73c0-1.59.78-3.14 3.27-3.14h2.53v-4.94s-2.3-.39-4.49-.39c-4.58 0-7.57 2.78-7.57 7.8V24h-5.08v5.78h5.08v13.98c1.02.16 2.07.24 3.14.24s2.12-.08 3.14-.24V29.78h4.67z"/>
    </svg>
  );
}

function FacebookLanding() {
  const [categoria, setCategoria] = useState<Categoria>("seguidores");
  const [planId, setPlanId] = useState<string>("");
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blockedMap = useBlockedMap();
  const fbType = categoria === "seguidores" ? "followers" : "likes";
  const tipoBloqueado = isBlocked(blockedMap, "facebook", fbType);

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
        if (res.status === "paid") { stop(); setPaid(true); playSuccessAudio(); return; }
        if (res.status === "mp_rejected_insufficient") { stop(); setRejected(true); toast.error("❌ Pagamento recusado: saldo insuficiente no banco emissor."); return; }
        if (res.status === "mp_refunded" || res.status === "SMM_FAILED") { stop(); setRejected(true); toast.error("❌ Instabilidade temporária de envio. Para sua segurança, seu pagamento foi ESTORNADO AUTOMATICAMENTE para a sua conta bancária em tempo real! Por favor, verifique seu extrato e tente novamente em alguns instantes.", { duration: 15000 }); return; }
        if (typeof res.status === "string" && res.status.startsWith("mp_")) { stop(); setRejected(true); toast.error("❌ Pagamento recusado pelo Mercado Pago."); return; }
      } catch (err) { console.error("[fb poll]", err); }
    };
    tick();
    interval = setInterval(tick, 1000);
    const hardStop = setTimeout(stop, 180_000); // v104 anti-loop 3min
    return () => { stop(); clearTimeout(hardStop); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, rejected, getStatusFn]);

  
  const dyn = useDynamicPlans({
    seguidores: { category: "facebook:seguidores", fallback: followersPlans, unitLabel: "Seguidores" },
    curtidas:   { category: "facebook:curtidas",   fallback: likesPlans,     unitLabel: "Curtidas" },
  });
  const currentPlans = categoria === "seguidores" ? dyn.seguidores : dyn.curtidas;
  const dynAllPlans = [...dyn.seguidores, ...dyn.curtidas];
  const isFollowers = categoria === "seguidores";

  const submit = async (selected: Plan) => {
    const schema = selected.id.startsWith("ff") ? profileSchema : postSchema;
    const parsed = schema.safeParse({ plan: selected.id, profile });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setPlanId(selected.id);
    setLoading(true);
    try {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("eliteboost:upsell-intent"));
      const res = await criarPedidoFn({
        data: {
          instagram_user: parsed.data.profile,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: "cliente@facebook.eliteboostprime.com",
          rede_social: "facebook",
          utm_source: getUtmSource(),
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
        profile: parsed.data.profile,
        pixCode: res.qrCode,
        qrCodeBase64: res.qrCodeBase64,
        pedidoId: res.pedidoId,
      });
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar pedido.");
    } finally {
      setLoading(false);
    }
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
    <MobileFrame bg={BG} route="/facebook">
      <PlansShowcaseProvider accent={BLUE}>
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b transition-all duration-300" style={{ borderColor: `${BLUE}66` }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">ELITEBOOST PRIME</span>
          </div>
          <ShowcaseTrigger />
        </div>
      </header>
      <ShowcaseShell>
      <PremiumCategorySelector
        accent={BLUE}
        active={categoria}
        onChange={(k) => { setCategoria(k as Categoria); setPlanId(""); setProfile(""); }}
        items={[
          { key: "seguidores", label: "Seguidores", emoji: "🔵", badge: "🔥 Mais Popular", badgeColor: "#39ff14" },
          { key: "curtidas",   label: "Curtidas",   emoji: "👍", badge: "Em Alta",          badgeColor: "#fe0979" },
          { key: "_views",     label: "Em Breve",   emoji: "🎬", badge: "Recomendado",      badgeColor: BLUE },
        ]}
      />
      <div data-avatar-proof-row className="relative z-50 mx-auto mt-1 mb-2 flex w-full max-w-[550px] items-center justify-between gap-2 px-2 sm:px-3">
        <FabianoBadge variant="facebook" inline />
        <SocialProofPopup route="/facebook" />
        <JarvisBadge variant="facebook" inline />
      </div>
      <PremiumPricingGrid
        accent={BLUE}
        disabled={tipoBloqueado}
        disabledLabel="⚠️ Em manutenção"
        unit={isFollowers ? "Seguidores" : "Curtidas"}
        plans={currentPlans.map((p, i) => ({
          id: p.id,
          qty: p.quantidade.toLocaleString("pt-BR"),
          price: p.price,
          fire: i === 1,
        }))}
        onBuy={(id) => { setPlanId(id); document.getElementById("fb-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
      />


      {planId && (<section
        id="fb-pedido"
        className="py-12 border-y"
        style={{ borderColor: `${BLUE}44`, background: "#0d0d0e" }}
      >
        <div className="container mx-auto px-4 sm:px-6 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Finalizar pedido</h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            {isFollowers ? "Cole o link do perfil ou página do Facebook." : "Cole o link do post ou foto do Facebook."}
          </p>

          <div
            className="mt-6 rounded-2xl p-6 space-y-5"
            style={{
              background: BG,
              border: `1px solid ${BLUE}66`,
              boxShadow: `0 0 30px ${BLUE}33`,
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
                            background: `${BLUE}22`,
                            border: `1px solid ${BLUE}`,
                            color: "#fff",
                            boxShadow: `0 0 18px ${BLUE}66`,
                          }
                        : { background: "#111", border: "1px solid #222", color: "#d4d4d8" }
                    }
                  >
                    <span>{p.tier}</span>
                    <span style={{ color: BLUE }}>{p.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fb-profile">
                {isFollowers ? "Link do perfil/página do Facebook" : "Link do post/foto do Facebook"}
              </Label>
              <Input
                id="fb-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder={isFollowers ? "https://facebook.com/suapagina" : "https://facebook.com/.../posts/..."}
                className="h-12"
                style={{ background: "#111", borderColor: `${BLUE}66`, color: "#fff" }}
                maxLength={300}
              />
            </div>

            <DelayedCouponField accent="#1877F2" />

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
                background: BLUE,
                color: "#fff",
                boxShadow: `0 0 35px ${BLUE}`,
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
          style={{ background: BG, border: `1px solid ${BLUE}`, boxShadow: `0 0 40px ${BLUE}88` }}
        >
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-white">
                  🎉 Pagamento confirmado!
                </DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  Seu pedido foi enviado ao Facebook. Entrega em minutos.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="size-20" style={{ color: BLUE }} />
                {pedidoInfo && (
                  <div className="text-center">
                    <div className="text-xs uppercase text-zinc-400">
                      {pedidoInfo.tier} · {pedidoInfo.profile}
                    </div>
                    <div className="text-3xl font-extrabold mt-1" style={{ color: BLUE }}>
                      {pedidoInfo.price}
                    </div>
                  </div>
                )}
              </div>
              <ViralShare route="/facebook" />
              <Button
                size="lg"
                className="w-full h-12 font-bold"
                style={{ background: BLUE, color: "#fff" }}
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
                    style={{ background: "#111", border: `1px solid ${BLUE}66` }}
                  >
                    <div className="text-xs uppercase text-zinc-400">
                      {pedidoInfo.tier} · {pedidoInfo.profile}
                    </div>
                    <div className="text-2xl font-extrabold mt-1" style={{ color: BLUE }}>
                      {pedidoInfo.price}
                    </div>
                  </div>
                  <PixCountdown
                      active={modalOpen && !paid && !!pedidoInfo?.pedidoId}
                      onExpire={() => { setModalOpen(false); setPedidoInfo(null); toast.error("Tempo limite de pagamento esgotado. Por favor, gere um novo pedido para garantir o seu crescimento!"); }}
                    />
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${BLUE}aa` }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" width={220} height={220} className="block" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Pix Copia e Cola</Label>
                    <div
                      className="rounded-lg p-3 text-xs break-all font-mono max-h-24 overflow-y-auto"
                      style={{ background: "#111", border: `1px solid ${BLUE}66`, color: "#e4e4e7" }}
                    >
                      {pedidoInfo.pixCode}
                    </div>
                    <Button
                      type="button"
                      onClick={copyPix}
                      variant="outline"
                      className="w-full h-11"
                      style={{ background: "#111", borderColor: BLUE, color: "#fff" }}
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
      </ShowcaseShell>
      </PlansShowcaseProvider>
    </MobileFrame>
  );
}
