import { ViralShare } from "@/components/ViralShare";
import { FabianoBadge } from "@/components/FabianoBadge";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { useScrolledPast } from "@/hooks/useScroll";
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
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { getPedidoStatus } from "@/lib/admin.functions";
import ogFacebook from "@/assets/og-facebook.jpg";

export const Route = createFileRoute("/facebook")({
  head: () => {
    const title = "Comprar Seguidores no Facebook e Curtidas | Boostygram";
    const description =
      "Comprar seguidores no Facebook e curtidas reais com entrega via Pix automático. Pacotes para crescer perfil, página e posts rapidamente.";
    const keywords =
      "comprar seguidores facebook, comprar curtidas facebook, seguidores facebook barato, curtidas post facebook, crescer pagina facebook, agência smm facebook brasil";
    const url = "https://boostygram.lovable.app/facebook";
    const ogImage = `https://boostygram.lovable.app${ogFacebook}?v=1`;
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

const followersPlans: Plan[] = [
  { id: "ff500", tier: "500 Seguidores",   quantidade: 500,  valor: 19.0, price: "R$ 19,00" },
  { id: "ff1k",  tier: "1.000 Seguidores", quantidade: 1000, valor: 29.0, price: "R$ 29,00" },
  { id: "ff2k5", tier: "2.500 Seguidores", quantidade: 2500, valor: 69.0, price: "R$ 69,00" },
];
const likesPlans: Plan[] = [
  { id: "fl500", tier: "500 Curtidas",   quantidade: 500,  valor: 9.0,  price: "R$ 9,00" },
  { id: "fl1k",  tier: "1.000 Curtidas", quantidade: 1000, valor: 15.0, price: "R$ 15,00" },
  { id: "fl2k",  tier: "2.000 Curtidas", quantidade: 2000, valor: 27.0, price: "R$ 27,00" },
];
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
  const scrolled = useScrolledPast(50);
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

  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getStatusFn({ data: { id } });
        if (!cancelled && res.ok && res.status === "paid") setPaid(true);
      } catch (err) {
        console.error("[fb poll]", err);
      }
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, getStatusFn]);

  const currentPlans = categoria === "seguidores" ? followersPlans : likesPlans;
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
      const res = await criarPedidoFn({
        data: {
          instagram_user: parsed.data.profile,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: "cliente@facebook.boostygram.com",
          rede_social: "facebook",
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
    <MobileFrame bg={BG} route="/facebook">
      <FabianoBadge variant="facebook" />
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] z-40 transition-all duration-300 backdrop-blur-xl bg-black/70 border-b ${
          scrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
        style={{ borderColor: `${BLUE}66` }}
      >
        <div className="container mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FacebookIcon size={18} />
            <span className="font-bold text-sm text-white">BOOSTYGRAM</span>
          </div>
          <span className="text-xs" style={{ color: BLUE }}>FACEBOOK ⚡</span>
        </div>
      </div>
      <header className="container mx-auto px-6 pt-10 pb-6 text-center">
        <div
          className="mx-auto mb-6 size-20 rounded-2xl grid place-items-center"
          style={{
            background: BG,
            boxShadow: `0 0 30px ${BLUE}, 0 0 60px ${BLUE}aa`,
            border: `1px solid ${BLUE}`,
          }}
        >
          <FacebookIcon size={42} />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span style={{ color: "#fff", textShadow: `0 0 18px ${BLUE}` }}>BOOSTYGRAM</span>{" "}
          <span style={{ color: BLUE, textShadow: `0 0 18px ${BLUE}` }}>| DOMINE O FACEBOOK ⚡</span>
        </h1>
        <p className="mt-4 text-zinc-300 max-w-xl mx-auto">
          Seguidores e curtidas reais via Pix · entrega automática · sem senha
        </p>
      </header>

      <div className="flex justify-center mb-10 px-4">
        <div
          className="inline-flex w-full sm:w-auto p-1 rounded-full"
          style={{ background: "#111", border: `1px solid ${BLUE}55` }}
        >
          {(["seguidores", "curtidas"] as Categoria[]).map((c) => {
            const active = categoria === c;
            const label = c === "seguidores" ? "🔵 Seguidores" : "👍 Curtidas";
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setCategoria(c); setPlanId(""); setProfile(""); }}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide transition-all"
                style={
                  active
                    ? {
                        background: BLUE,
                        color: "#fff",
                        boxShadow: `0 0 22px ${BLUE}, 0 0 30px ${BLUE}88`,
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

      <section className="container mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {currentPlans.map((p) => {
            const Icon = isFollowers ? Users : ThumbsUp;
            return (
              <div
                key={p.id}
                className="relative rounded-2xl p-6 flex flex-col items-center text-center"
                style={{
                  background: "#0f0f10",
                  border: `1px solid ${BLUE}66`,
                  boxShadow: `0 0 24px ${BLUE}33`,
                }}
              >
                <div
                  className="mb-4 size-16 rounded-2xl grid place-items-center"
                  style={{
                    background: BG,
                    border: `1px solid ${BLUE}`,
                    boxShadow: `0 0 24px ${BLUE}, 0 0 40px ${BLUE}aa`,
                  }}
                >
                  <Icon className="size-7 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="text-xl font-bold">{p.tier}</h3>
                <div
                  className="mt-3 text-4xl font-extrabold tracking-tight"
                  style={{ color: "#fff", textShadow: `0 0 14px ${BLUE}` }}
                >
                  {p.price}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {isFollowers ? "Entrega direta no perfil/página" : "Disparo direto no post/foto"}
                </p>

                <button
                  type="button"
                  disabled={tipoBloqueado}
                  onClick={() => { setPlanId(p.id); document.getElementById("fb-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
                  style={tipoBloqueado
                    ? { background: "#222", color: "#888", border: `1px solid ${BLUE}44` }
                    : { background: BLUE, color: "#fff", boxShadow: `0 0 22px ${BLUE}aa` }}
                >
                  <Zap className="size-4" /> {tipoBloqueado ? "Instabilidade Temporária - Reposição de Estoque" : "Comprar agora"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section
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
                background: BLUE,
                color: "#fff",
                boxShadow: `0 0 25px ${BLUE}aa`,
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
      <BottomNav active="/facebook" />
    </MobileFrame>
  );
}
