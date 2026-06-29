import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { ViralShare } from "@/components/ViralShare";
import { JarvisBadge } from "@/components/JarvisBadge";
import { FabianoBadge } from "@/components/FabianoBadge";
import { PlansShowcaseProvider, ShowcaseTrigger, ShowcaseShell } from "@/components/PlansShowcase";
import { MobileFrame } from "@/components/MobileFrame";
import { PremiumCategorySelector } from "@/components/PremiumCategorySelector";
import { PremiumPricingGrid } from "@/components/PremiumPricingGrid";
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
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { getUtmSource } from "@/lib/utm";
import { getPedidoStatus } from "@/lib/admin.functions";
import { CouponField } from "@/components/CouponField";
import ogTiktok from "@/assets/og-tiktok.jpg";

export const Route = createFileRoute("/tiktok")({
  head: () => {
    const title = "Comprar Seguidores no TikTok Barato e Real | EliteBoost Prime";
    const description =
      "Comprar seguidores no TikTok e visualizações com entrega imediata via Pix automático. Pacotes reais com reposição garantida para bater os requisitos de monetização rápido.";
    const keywords =
      "comprar seguidores tiktok, comprar views tiktok, visualizações tiktok barato, comprar curtidas tiktok, monetizar tiktok rápido, seguidores tiktok pix, impulsionar tiktok, agência smm brasil tiktok, como ganhar seguidores no tiktok";
    const url = "https://eliteboostprime.lovable.app/tiktok";
    const ogImage = `https://eliteboostprime.lovable.app${ogTiktok}?v=33`;
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
  component: TiktokLanding,
});

type Categoria = "seguidores" | "curtidas" | "visualizacoes";
type Plan = { id: string; tier: string; qty: string; quantidade: number; valor: number; price: string };

const followersPlans: Plan[] = [
  { id: "tf100",  tier: "100 Seguidores",     qty: "100",    quantidade: 100,    valor: 9.0,   price: "R$ 9,00" },
  { id: "tf500",  tier: "500 Seguidores",     qty: "500",    quantidade: 500,    valor: 29.0,  price: "R$ 29,00" },
  { id: "tf1k",   tier: "1.000 Seguidores",   qty: "1000",   quantidade: 1000,   valor: 49.0,  price: "R$ 49,00" },
  { id: "tf2k",   tier: "2.000 Seguidores",   qty: "2000",   quantidade: 2000,   valor: 89.0,  price: "R$ 89,00" },
  { id: "tf5k",   tier: "5.000 Seguidores",   qty: "5000",   quantidade: 5000,   valor: 199.0, price: "R$ 199,00" },
  { id: "tf10k",  tier: "10.000 Seguidores",  qty: "10000",  quantidade: 10000,  valor: 379.0, price: "R$ 379,00" },
  { id: "tf25k",  tier: "25.000 Seguidores",  qty: "25000",  quantidade: 25000,  valor: 849.0, price: "R$ 849,00" },
  { id: "tf50k",  tier: "50.000 Seguidores",  qty: "50000",  quantidade: 50000,  valor: 1590.0, price: "R$ 1.590,00" },
];
const likesPlans: Plan[] = [
  { id: "tl100",  tier: "100 Curtidas",   qty: "100",   quantidade: 100,   valor: 4.0,  price: "R$ 4,00" },
  { id: "tl500",  tier: "500 Curtidas",   qty: "500",   quantidade: 500,   valor: 9.0,  price: "R$ 9,00" },
  { id: "tl1k",   tier: "1.000 Curtidas", qty: "1000",  quantidade: 1000,  valor: 15.0, price: "R$ 15,00" },
  { id: "tl2k",   tier: "2.000 Curtidas", qty: "2000",  quantidade: 2000,  valor: 27.0, price: "R$ 27,00" },
  { id: "tl5k",   tier: "5.000 Curtidas", qty: "5000",  quantidade: 5000,  valor: 59.0, price: "R$ 59,00" },
  { id: "tl10k",  tier: "10.000 Curtidas",qty: "10000", quantidade: 10000, valor: 109.0,price: "R$ 109,00" },
];
const viewsPlans: Plan[] = [
  { id: "tv1k",   tier: "1.000 Views",    qty: "1000",   quantidade: 1000,   valor: 3.0,  price: "R$ 3,00" },
  { id: "tv5k",   tier: "5.000 Views",    qty: "5000",   quantidade: 5000,   valor: 7.0,  price: "R$ 7,00" },
  { id: "tv10k",  tier: "10.000 Views",   qty: "10000",  quantidade: 10000,  valor: 12.0, price: "R$ 12,00" },
  { id: "tv25k",  tier: "25.000 Views",   qty: "25000",  quantidade: 25000,  valor: 24.0, price: "R$ 24,00" },
  { id: "tv50k",  tier: "50.000 Views",   qty: "50000",  quantidade: 50000,  valor: 39.0, price: "R$ 39,00" },
  { id: "tv100k", tier: "100.000 Views",  qty: "100000", quantidade: 100000, valor: 69.0, price: "R$ 69,00" },
  { id: "tv500k", tier: "500.000 Views",  qty: "500000", quantidade: 500000, valor: 290.0,price: "R$ 290,00" },
];
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
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blockedMap = useBlockedMap();
  const ttType = categoria === "seguidores" ? "followers" : categoria === "curtidas" ? "likes" : "views";
  const tipoBloqueado = isBlocked(blockedMap, "tiktok", ttType);

  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getStatusFn({ data: { id } });
        if (!cancelled && res.ok && res.status === "paid") { setPaid(true); playSuccessAudio(); }
      } catch (err) {
        console.error("[tt poll]", err);
      }
    };
    tick();
    const interval = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, getStatusFn]);

  const currentPlans =
    categoria === "seguidores" ? followersPlans :
    categoria === "curtidas" ? likesPlans : viewsPlans;

  const isFollowers = categoria === "seguidores";

  const submit = async (selected: Plan) => {
    const schema = selected.id.startsWith("tf") ? followersSchema : videoSchema;
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
          email: "cliente@tiktok.boostygram.com",
          rede_social: "tiktok",
          utm_source: getUtmSource(),
        },
      });
      if (!res?.ok) {
        toast.error("Não foi possível gerar o Pix. Tente novamente.");
        return;
      }
      setPaid(false);
      setPedidoInfo({
        price: selected.price,
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
    // v2: solid bg, no glitch
    <MobileFrame bg="#0a0a0a" route="/tiktok">
      <PlansShowcaseProvider accent={CYAN}>
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b transition-all duration-300" style={{ borderColor: `${CYAN}66` }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">ELITEBOOST PRIME</span>
          </div>
          <ShowcaseTrigger />
        </div>
      </header>
      <JarvisBadge variant="tiktok" />
      <FabianoBadge variant="tiktok" />
      <ShowcaseShell>
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
            className="mt-6 rounded-2xl p-6 space-y-5"
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

            <CouponField accent="#00f2fe" />

            <Button
              type="button"
              size="lg"
              disabled={loading || !planId || tipoBloqueado}
              onClick={() => {
                const sel = allPlans.find((p) => p.id === planId);
                if (!sel) { toast.error("Selecione um pacote."); return; }
                submit(sel);
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
                  🎉 Pagamento confirmado!
                </DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  Seu pedido foi enviado ao TikTok. Entrega em minutos.
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
              <ViralShare route="/tiktok" />
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
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${CYAN}88` }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" width={220} height={220} className="block" />
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
      </ShowcaseShell>
      </PlansShowcaseProvider>
    </MobileFrame>
  );
}
