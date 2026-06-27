import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { ViralShare } from "@/components/ViralShare";
import { FabianoBadge } from "@/components/FabianoBadge";
import { JarvisBadge } from "@/components/JarvisBadge";
import { MobileFrame } from "@/components/MobileFrame";
import { BottomNav } from "@/components/BottomNav";
import { useScrolledPast } from "@/hooks/useScroll";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Send, Copy, CheckCircle2, Zap, Globe2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { getPedidoStatus } from "@/lib/admin.functions";
import ogTrafego from "@/assets/og-trafego.jpg";

const NEON = "#B026FF";
const BG = "#0a0a0a";

export const Route = createFileRoute("/trafego")({
  head: () => {
    const title = "Comprar Tráfego Web Real Brasil e Mundial | EliteBoost Prime";
    const description = "Compre tráfego web real para seu site ou landing page. Visitas geo-segmentadas Brasil ou Global, entrega automática via Pix.";
    const url = "https://eliteboostprime.lovable.app/trafego";
    const ogImage = `https://eliteboostprime.lovable.app${ogTrafego}?v=33`;
    return {
      meta: [
        { title }, { name: "description", content: description },
        { name: "keywords", content: "comprar tráfego web, comprar visitas site, tráfego brasileiro, tráfego mundial, smm tráfego, comprar visitantes landing page" },
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
    };
  },
  component: TrafegoLanding,
});

type Categoria = "brasil" | "mundial";
type Plan = { id: string; tier: string; quantidade: number; valor: number; price: string };

const brPlans: Plan[] = [
  { id: "wbr1k",  tier: "1.000 Visitas BR",  quantidade: 1000,  valor: 19.0,  price: "R$ 19,00" },
  { id: "wbr5k",  tier: "5.000 Visitas BR",  quantidade: 5000,  valor: 69.0,  price: "R$ 69,00" },
  { id: "wbr10k", tier: "10.000 Visitas BR", quantidade: 10000, valor: 119.0, price: "R$ 119,00" },
];
const glPlans: Plan[] = [
  { id: "wgl1k",  tier: "1.000 Visitas Global",  quantidade: 1000,  valor: 9.0,  price: "R$ 9,00" },
  { id: "wgl5k",  tier: "5.000 Visitas Global",  quantidade: 5000,  valor: 29.0, price: "R$ 29,00" },
  { id: "wgl10k", tier: "10.000 Visitas Global", quantidade: 10000, valor: 49.0, price: "R$ 49,00" },
];
const allPlans = [...brPlans, ...glPlans];

const urlSchema = z.object({
  plan: z.string().min(1),
  profile: z.string().trim()
    .min(8, "Cole a URL completa do site")
    .max(500, "Máximo 500 caracteres")
    .regex(/^https?:\/\//i, "Por favor, insira o link completo do perfil, vídeo ou publicação."),
});

type PedidoInfo = { price: string; tier: string; profile: string; pixCode: string; qrCodeBase64: string; pedidoId: string | null };

function TrafegoLanding() {
  const scrolled = useScrolledPast(50);
  const [categoria, setCategoria] = useState<Categoria>("brasil");
  const [planId, setPlanId] = useState("");
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blockedMap = useBlockedMap();
  const trType = categoria === "brasil" ? "br" : "global";
  const tipoBloqueado = isBlocked(blockedMap, "trafego", trType);

  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getStatusFn({ data: { id } });
        if (!cancelled && res.ok && res.status === "paid") { setPaid(true); playSuccessAudio(); }
      } catch {}
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, getStatusFn]);

  const currentPlans = categoria === "brasil" ? brPlans : glPlans;

  const submit = async (selected: Plan) => {
    const parsed = urlSchema.safeParse({ plan: selected.id, profile });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    // Sandbox Mode (admin-only flag em localStorage)
    if (typeof window !== "undefined" && window.localStorage.getItem("ELITEBOOST_PRIME_SANDBOX") === "1") {
      setPaid(false);
      setPedidoInfo({
        price: selected.price, tier: selected.tier, profile: parsed.data.profile,
        pixCode: "00020126[SANDBOX-MOCK-NO-CHARGE]", qrCodeBase64: "", pedidoId: null,
      });
      setModalOpen(true);
      setTimeout(() => setPaid(true), 2000);
      return;
    }

    setPlanId(selected.id);
    setLoading(true);
    try {
      const res = await criarPedidoFn({
        data: {
          instagram_user: parsed.data.profile, pacote: selected.id,
          quantidade: selected.quantidade, valor: selected.valor,
          email: "cliente@trafego.boostygram.com", rede_social: "trafego",
        },
      });
      if (!res?.ok) { toast.error("Não foi possível gerar o Pix."); return; }
      setPaid(false);
      setPedidoInfo({
        price: selected.price, tier: selected.tier, profile: parsed.data.profile,
        pixCode: res.qrCode, qrCodeBase64: res.qrCodeBase64, pedidoId: res.pedidoId,
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
      <FabianoBadge variant="trafego" />
      <JarvisBadge variant="trafego" />
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] z-40 transition-all duration-300 backdrop-blur-xl bg-black/70 border-b ${
          scrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
        style={{ borderColor: `${NEON}66` }}
      >
        <div className="container mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 size={18} style={{ color: NEON }} />
            <span className="font-bold text-sm text-white">ELITEBOOST PRIME</span>
          </div>
          <span className="text-xs" style={{ color: NEON }}>TRÁFEGO WEB ⚡</span>
        </div>
      </div>
      <header className="container mx-auto px-6 pt-10 pb-6 text-center">
        <div className="mx-auto mb-6 size-20 rounded-2xl grid place-items-center"
          style={{ background: BG, boxShadow: `0 0 30px ${NEON}, 0 0 60px ${NEON}aa`, border: `1px solid ${NEON}` }}>
          <Globe2 size={42} style={{ color: NEON }} />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span style={{ color: "#fff", textShadow: `0 0 18px ${NEON}` }}>ELITEBOOST PRIME</span>{" "}
          <span style={{ color: NEON, textShadow: `0 0 18px ${NEON}` }}>| TRÁFEGO WEB ⚡</span>
        </h1>
        <p className="mt-4 text-zinc-300 max-w-xl mx-auto">Visitas reais para seu site · entrega automática via Pix · geo-segmentado</p>
      </header>

      <div className="flex justify-center mb-10 px-4">
        <div className="inline-flex w-full sm:w-auto p-1 rounded-full" style={{ background: "#111", border: `1px solid ${NEON}55` }}>
          {(["brasil", "mundial"] as Categoria[]).map((c) => {
            const active = categoria === c;
            const label = c === "brasil" ? "🇧🇷 Brasil" : "🌎 Mundial";
            return (
              <button key={c} type="button"
                onClick={() => { setCategoria(c); setPlanId(""); setProfile(""); }}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide transition-all"
                style={active
                  ? { background: NEON, color: "#fff", boxShadow: `0 0 22px ${NEON}, 0 0 30px ${NEON}88` }
                  : { color: "#a1a1aa", background: "transparent" }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="container mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {currentPlans.map((p) => (
            <div key={p.id} className="relative rounded-2xl p-6 flex flex-col items-center text-center"
              style={{ background: "#0f0f10", border: `1px solid ${NEON}66`, boxShadow: `0 0 24px ${NEON}33` }}>
              <div className="mb-4 size-16 rounded-2xl grid place-items-center"
                style={{ background: BG, border: `1px solid ${NEON}`, boxShadow: `0 0 24px ${NEON}, 0 0 40px ${NEON}aa` }}>
                <MapPin className="size-7" style={{ color: NEON }} strokeWidth={2.2} />
              </div>
              <h3 className="text-xl font-bold">{p.tier}</h3>
              <div className="mt-3 text-4xl font-extrabold tracking-tight" style={{ color: "#fff", textShadow: `0 0 14px ${NEON}` }}>{p.price}</div>
              <p className="mt-2 text-xs text-zinc-400">Visitas reais com geo-segmentação</p>
              <button type="button"
                disabled={tipoBloqueado}
                onClick={() => { setPlanId(p.id); document.getElementById("tw-pedido")?.scrollIntoView({ behavior: "smooth" }); }}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
                style={tipoBloqueado
                  ? { background: "#222", color: "#888", border: `1px solid ${NEON}44` }
                  : { background: NEON, color: "#fff", boxShadow: `0 0 22px ${NEON}aa` }}>
                <Zap className="size-4" /> {tipoBloqueado ? "Instabilidade Temporária - Reposição de Estoque" : "Comprar agora"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="tw-pedido" className="py-12 border-y" style={{ borderColor: `${NEON}44`, background: "#0d0d0e" }}>
        <div className="container mx-auto px-4 sm:px-6 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Finalizar pedido</h2>
          <p className="mt-2 text-center text-sm text-zinc-400">Cole a URL completa do seu site ou landing page.</p>
          <div className="mt-6 rounded-2xl p-6 space-y-5" style={{ background: BG, border: `1px solid ${NEON}66`, boxShadow: `0 0 30px ${NEON}33` }}>
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
            <Button type="button" size="lg" disabled={loading || !planId || tipoBloqueado}
              onClick={() => { const sel = allPlans.find((p) => p.id === planId); if (!sel) { toast.error("Selecione um pacote."); return; } submit(sel); }}
              className="w-full h-12 font-extrabold uppercase tracking-wide border-0"
              style={{ background: NEON, color: "#fff", boxShadow: `0 0 25px ${NEON}aa` }}>
              {tipoBloqueado ? "Instabilidade Temporária - Reposição de Estoque" : loading ? "Gerando Pix..." : (<>Gerar Pix <Send className="size-4 ml-2" /></>)}
            </Button>
            <p className="text-[11px] text-center text-zinc-500">Pagamento seguro via Pix · entrega automática</p>
          </div>
        </div>
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border-0" style={{ background: BG, border: `1px solid ${NEON}`, boxShadow: `0 0 40px ${NEON}88` }}>
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-white">🎉 Pagamento confirmado!</DialogTitle>
                <DialogDescription className="text-center text-zinc-400">Seu pedido entrou na fila. Entrega gradual.</DialogDescription>
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
              <ViralShare route="/trafego" />
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
                    <div className="flex justify-center">
                      <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${NEON}aa` }}>
                        <img src={qrCodeUrl} alt="QR Code Pix" width={220} height={220} className="block" />
                      </div>
                    </div>
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
      <BottomNav active="/trafego" />
    </MobileFrame>
  );
}
