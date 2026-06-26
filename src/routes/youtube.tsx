import { ViralShare } from "@/components/ViralShare";
import { FabianoBadge } from "@/components/FabianoBadge";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { useScrolledPast } from "@/hooks/useScroll";
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
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { getPedidoStatus } from "@/lib/admin.functions";
import ogYoutube from "@/assets/og-youtube.jpg";

export const Route = createFileRoute("/youtube")({
  head: () => {
    const title = "Comprar Inscritos no YouTube e Views Reais | EliteBoost Prime";
    const description =
      "Comprar inscritos no YouTube e visualizações reais com entrega via Pix automático. Pacotes para crescer e monetizar seu canal rápido.";
    const keywords =
      "comprar inscritos youtube, comprar views youtube, visualizações youtube barato, crescer canal youtube, monetizar canal youtube pix, agência smm youtube brasil";
    const url = "https://eliteboostprime.lovable.app/youtube";
    const ogImage = `https://eliteboostprime.lovable.app${ogYoutube}?v=10`;
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
  component: YoutubeLanding,
});

type Categoria = "inscritos" | "visualizacoes";
type Plan = { id: string; tier: string; quantidade: number; valor: number; price: string };

const subsPlans: Plan[] = [
  { id: "ys100", tier: "100 Inscritos",   quantidade: 100,  valor: 29.0,  price: "R$ 29,00" },
  { id: "ys500", tier: "500 Inscritos",   quantidade: 500,  valor: 99.0,  price: "R$ 99,00" },
  { id: "ys1k",  tier: "1.000 Inscritos", quantidade: 1000, valor: 189.0, price: "R$ 189,00" },
];
const viewsPlans: Plan[] = [
  { id: "yv1k",  tier: "1.000 Views",   quantidade: 1000,  valor: 19.0, price: "R$ 19,00" },
  { id: "yv5k",  tier: "5.000 Views",   quantidade: 5000,  valor: 59.0, price: "R$ 59,00" },
  { id: "yv10k", tier: "10.000 Views",  quantidade: 10000, valor: 99.0, price: "R$ 99,00" },
];
const allPlans = [...subsPlans, ...viewsPlans];

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
  const scrolled = useScrolledPast(50);
  const [categoria, setCategoria] = useState<Categoria>("inscritos");
  const [planId, setPlanId] = useState<string>("");
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blockedMap = useBlockedMap();
  const ytType = categoria === "inscritos" ? "followers" : "views";
  const tipoBloqueado = isBlocked(blockedMap, "youtube", ytType);

  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getStatusFn({ data: { id } });
        if (!cancelled && res.ok && res.status === "paid") setPaid(true);
      } catch (err) {
        console.error("[yt poll]", err);
      }
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, getStatusFn]);

  const currentPlans = categoria === "inscritos" ? subsPlans : viewsPlans;
  const isSubs = categoria === "inscritos";

  const submit = async (selected: Plan) => {
    const schema = selected.id.startsWith("ys") ? channelSchema : videoSchema;
    const parsed = schema.safeParse({ plan: selected.id, profile });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setPlanId(selected.id);
    setLoading(true);
    try {
      const res = await criarPedidoFn({
        data: {
          instagram_user: parsed.data.profile,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: "cliente@youtube.boostygram.com",
          rede_social: "youtube",
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
    <MobileFrame bg="#0a0a0a" route="/youtube">
      <FabianoBadge variant="youtube" />
      {/* HERO */}
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] z-40 transition-all duration-300 backdrop-blur-xl bg-black/70 border-b ${
          scrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
        style={{ borderColor: `${RED}66` }}
      >
        <div className="container mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <YouTubeIcon size={18} />
            <span className="font-bold text-sm text-white">ELITEBOOST PRIME</span>
          </div>
          <span className="text-xs" style={{ color: RED }}>YOUTUBE ⚡</span>
        </div>
      </div>
      <header className="container mx-auto px-6 pt-10 pb-6 text-center">
        <div
          className="mx-auto mb-6 size-20 rounded-2xl grid place-items-center"
          style={{
            background: BG,
            boxShadow: `0 0 30px ${RED}, 0 0 60px ${RED}aa`,
            border: `1px solid ${RED}`,
          }}
        >
          <YouTubeIcon size={42} />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span style={{ color: "#fff", textShadow: `0 0 18px ${RED}` }}>ELITEBOOST PRIME</span>{" "}
          <span style={{ color: RED, textShadow: `0 0 18px ${RED}` }}>| DOMINE O YOUTUBE ⚡</span>
        </h1>
        <p className="mt-4 text-zinc-300 max-w-xl mx-auto">
          Inscritos e visualizações reais via Pix · entrega automática · sem senha
        </p>
      </header>

      {/* TABS */}
      <div className="flex justify-center mb-10 px-4">
        <div
          className="inline-flex w-full sm:w-auto p-1 rounded-full"
          style={{ background: "#111", border: `1px solid ${RED}55` }}
        >
          {(["inscritos", "visualizacoes"] as Categoria[]).map((c) => {
            const active = categoria === c;
            const label = c === "inscritos" ? "📺 Inscritos" : "🎬 Visualizações";
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setCategoria(c); setPlanId(""); setProfile(""); }}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide transition-all"
                style={
                  active
                    ? {
                        background: RED,
                        color: "#fff",
                        boxShadow: `0 0 22px ${RED}, 0 0 30px ${RED}88`,
                      }
                    : { color: "#a1a1aa", background: "transparent" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* PLANS */}
      <section className="container mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {currentPlans.map((p) => {
            const Icon = isSubs ? Users : Eye;
            return (
              <div
                key={p.id}
                className="relative rounded-2xl p-6 flex flex-col items-center text-center"
                style={{
                  background: "#0f0f10",
                  border: `1px solid ${RED}66`,
                  boxShadow: `0 0 24px ${RED}33`,
                }}
              >
                <div
                  className="mb-4 size-16 rounded-2xl grid place-items-center"
                  style={{
                    background: BG,
                    border: `1px solid ${RED}`,
                    boxShadow: `0 0 24px ${RED}, 0 0 40px ${RED}aa`,
                  }}
                >
                  <Icon className="size-7 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="text-xl font-bold">{p.tier}</h3>
                <div
                  className="mt-3 text-4xl font-extrabold tracking-tight"
                  style={{ color: "#fff", textShadow: `0 0 14px ${RED}` }}
                >
                  {p.price}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {isSubs ? "Entrega direta no canal" : "Disparo direto no vídeo"}
                </p>

                <button
                  type="button"
                  disabled={tipoBloqueado}
                  onClick={() => { setPlanId(p.id); document.getElementById("yt-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
                  style={tipoBloqueado
                    ? { background: "#222", color: "#888", border: `1px solid ${RED}44` }
                    : { background: RED, color: "#fff", boxShadow: `0 0 22px ${RED}aa` }}
                >
                  <Zap className="size-4" /> {tipoBloqueado ? "⚠️ Indisponível Temporariamente (Manutenção do Servidor)" : "Comprar agora"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FORM */}
      <section
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
            className="mt-6 rounded-2xl p-6 space-y-5"
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

            <Button
              type="button"
              size="lg"
              disabled={loading || !planId || tipoBloqueado}
              onClick={() => {
                const sel = allPlans.find((p) => p.id === planId);
                if (!sel) { toast.error("Selecione um pacote."); return; }
                submit(sel);
              }}
              className="w-full h-12 font-extrabold uppercase tracking-wide border-0"
              style={{
                background: RED,
                color: "#fff",
                boxShadow: `0 0 25px ${RED}aa`,
              }}
            >
              {tipoBloqueado ? "⚠️ Indisponível Temporariamente (Manutenção do Servidor)" : loading ? "Gerando Pix..." : (<>Gerar Pix <Send className="size-4 ml-2" /></>)}
            </Button>
            <p className="text-[11px] text-center text-zinc-500">
              Pagamento seguro via Pix · sem senha · entrega automática
            </p>
          </div>
        </div>
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-w-md border-0"
          style={{ background: BG, border: `1px solid ${RED}`, boxShadow: `0 0 40px ${RED}88` }}
        >
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-white">
                  🎉 Pagamento confirmado!
                </DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  Seu pedido foi enviado ao YouTube. Entrega em minutos.
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
              <ViralShare route="/youtube" />
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
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${RED}aa` }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" width={220} height={220} className="block" />
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
      <BottomNav active="/youtube" />
    </MobileFrame>
  );
}
