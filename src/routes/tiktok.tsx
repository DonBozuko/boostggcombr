import { FabianoBadge } from "@/components/FabianoBadge";
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
import { getPedidoStatus } from "@/lib/admin.functions";
import ogTiktok from "@/assets/og-tiktok.jpg";

export const Route = createFileRoute("/tiktok")({
  head: () => {
    const title = "Comprar Seguidores no TikTok Barato e Real | Boostygram";
    const description =
      "Comprar seguidores no TikTok e visualizações com entrega imediata via Pix automático. Pacotes reais com reposição garantida para bater os requisitos de monetização rápido.";
    const keywords =
      "comprar seguidores tiktok, comprar views tiktok, visualizações tiktok barato, comprar curtidas tiktok, monetizar tiktok rápido, seguidores tiktok pix, impulsionar tiktok, agência smm brasil tiktok, como ganhar seguidores no tiktok";
    const url = "https://boostygram.lovable.app/tiktok";
    const ogImage = `https://boostygram.lovable.app${ogTiktok}?v=3`;
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
  { id: "tf100", tier: "100 Seguidores",   qty: "100",  quantidade: 100,  valor: 9.0,  price: "R$ 9,00" },
  { id: "tf500", tier: "500 Seguidores",   qty: "500",  quantidade: 500,  valor: 29.0, price: "R$ 29,00" },
  { id: "tf1k",  tier: "1.000 Seguidores", qty: "1000", quantidade: 1000, valor: 49.0, price: "R$ 49,00" },
];
const likesPlans: Plan[] = [
  { id: "tl500", tier: "500 Curtidas",   qty: "500",  quantidade: 500,  valor: 9.0,  price: "R$ 9,00" },
  { id: "tl1k",  tier: "1.000 Curtidas", qty: "1000", quantidade: 1000, valor: 15.0, price: "R$ 15,00" },
  { id: "tl2k",  tier: "2.000 Curtidas", qty: "2000", quantidade: 2000, valor: 27.0, price: "R$ 27,00" },
];
const viewsPlans: Plan[] = [
  { id: "tv5k",  tier: "5.000 Views",   qty: "5000",  quantidade: 5000,  valor: 7.0,  price: "R$ 7,00" },
  { id: "tv10k", tier: "10.000 Views",  qty: "10000", quantidade: 10000, valor: 12.0, price: "R$ 12,00" },
  { id: "tv50k", tier: "50.000 Views",  qty: "50000", quantidade: 50000, valor: 39.0, price: "R$ 39,00" },
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
        if (!cancelled && res.ok && res.status === "paid") setPaid(true);
      } catch (err) {
        console.error("[tt poll]", err);
      }
    };
    tick();
    const interval = setInterval(tick, 3000);
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
      const res = await criarPedidoFn({
        data: {
          instagram_user: parsed.data.profile,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: "cliente@tiktok.boostygram.com",
          rede_social: "tiktok",
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
    <div
      className="min-h-screen text-white"
      style={{ background: "#0a0a0a" }}
    >
      <FabianoBadge variant="tiktok" />
      {/* HERO */}
      <header className="container mx-auto px-6 pt-10 pb-6 text-center">
        <div
          className="mx-auto mb-6 size-20 rounded-2xl grid place-items-center"
          style={{
            background: "#0a0a0a",
            boxShadow: `0 0 30px ${CYAN}, 0 0 60px ${PINK}`,
            border: `1px solid ${CYAN}`,
          }}
        >
          <TikTokIcon size={42} />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span style={{ color: "#fff", textShadow: `0 0 18px ${CYAN}` }}>BOOSTYGRAM</span>{" "}
          <span style={{ color: PINK, textShadow: `0 0 18px ${PINK}` }}>| ALAVANQUE SEU TIKTOK ⚡</span>
        </h1>
        <p className="mt-4 text-zinc-300 max-w-xl mx-auto">
          Seguidores, curtidas e views via Pix · entrega automática · sem senha
        </p>
      </header>

      {/* TABS */}
      <div className="flex justify-center mb-10 px-4">
        <div
          className="inline-flex w-full sm:w-auto p-1 rounded-full"
          style={{ background: "#111", border: `1px solid ${CYAN}40` }}
        >
          {(["seguidores", "curtidas", "visualizacoes"] as Categoria[]).map((c) => {
            const active = categoria === c;
            const label = c === "seguidores" ? "🎵 Seguidores" : c === "curtidas" ? "❤️ Curtidas" : "🎬 Visualizações";
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setCategoria(c); setPlanId(""); setProfile(""); }}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide transition-all"
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${CYAN}, ${PINK})`,
                        color: "#0a0a0a",
                        boxShadow: `0 0 22px ${CYAN}88, 0 0 30px ${PINK}66`,
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
            const isSeg = categoria === "seguidores";
            const Icon = categoria === "curtidas" ? Heart : Eye;
            return (
              <div
                key={p.id}
                className="relative rounded-2xl p-6 flex flex-col items-center text-center"
                style={{
                  background: "#0f0f10",
                  border: `1px solid ${CYAN}55`,
                  boxShadow: `0 0 24px ${CYAN}22, inset 0 0 20px ${PINK}10`,
                }}
              >
                <div
                  className="mb-4 size-16 rounded-2xl grid place-items-center"
                  style={{
                    background: "#0a0a0a",
                    border: `1px solid ${CYAN}`,
                    boxShadow: `0 0 24px ${CYAN}, 0 0 40px ${PINK}88`,
                  }}
                >
                  {isSeg ? <TikTokIcon size={28} /> : <Icon className="size-7 text-white" strokeWidth={2.2} />}
                </div>
                <h3 className="text-xl font-bold">{p.tier}</h3>
                <div
                  className="mt-3 text-4xl font-extrabold tracking-tight"
                  style={{ color: "#fff", textShadow: `0 0 14px ${CYAN}` }}
                >
                  {p.price}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {categoria === "seguidores" ? "Entrega imediata no perfil" : "Disparo direto no vídeo"}
                </p>

                <button
                  type="button"
                  disabled={tipoBloqueado}
                  onClick={() => { setPlanId(p.id); document.getElementById("tt-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
                  style={tipoBloqueado
                    ? { background: "#222", color: "#888", border: `1px solid ${CYAN}44` }
                    : {
                        background: planId === p.id ? PINK : `linear-gradient(135deg, ${CYAN}, ${PINK})`,
                        color: "#0a0a0a",
                        boxShadow: `0 0 22px ${PINK}88`,
                      }}
                >
                  <Zap className="size-4" /> {tipoBloqueado ? "Instabilidade Temporária - Reposição de Estoque" : "Comprar agora"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FORM */}
      <section
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
                background: `linear-gradient(135deg, ${CYAN}, ${PINK})`,
                color: "#0a0a0a",
                boxShadow: `0 0 25px ${PINK}88, 0 0 25px ${CYAN}88`,
              }}
            >
              {tipoBloqueado ? "Instabilidade Temporária - Reposição de Estoque" : loading ? "Gerando Pix..." : (<>Gerar Pix <Send className="size-4 ml-2" /></>)}
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
    </div>
  );
}
