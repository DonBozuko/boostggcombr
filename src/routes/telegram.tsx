import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { ViralShare } from "@/components/ViralShare";
import { FabianoBadge } from "@/components/FabianoBadge";
import { JarvisBadge } from "@/components/JarvisBadge";
import { MobileFrame } from "@/components/MobileFrame";
import { PremiumCategorySelector } from "@/components/PremiumCategorySelector";
import { PremiumPricingGrid } from "@/components/PremiumPricingGrid";
import { BottomNav } from "@/components/BottomNav";
import { useScrolledPast } from "@/hooks/useScroll";
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
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { getPedidoStatus } from "@/lib/admin.functions";
import { CouponField } from "@/components/CouponField";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import ogTelegram from "@/assets/og-telegram.jpg";

const AERO = "#00CCFF";
const BG = "#0a0a0a";

export const Route = createFileRoute("/telegram")({
  head: () => {
    const title = "Comprar Membros para Grupo e Canal do Telegram | EliteBoost Prime";
    const description =
      "Comprar membros reais para grupo e canal do Telegram com entrega via Pix automático. Crescimento real, recarga estável e suporte humano.";
    const url = "https://eliteboostprime.lovable.app/telegram";
    const ogImage = `https://eliteboostprime.lovable.app${ogTelegram}?v=33`;
    return {
      meta: [
        { title }, { name: "description", content: description },
        { name: "keywords", content: "comprar membros telegram, comprar inscritos canal telegram, membros grupo telegram, smm telegram brasil" },
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
  component: TelegramLanding,
});

type Categoria = "canal" | "grupo";
type Plan = { id: string; tier: string; quantidade: number; valor: number; price: string };

const canalPlans: Plan[] = [
  { id: "tgc500", tier: "500 Membros (Canal)",   quantidade: 500,  valor: 19.0, price: "R$ 19,00" },
  { id: "tgc1k",  tier: "1.000 Membros (Canal)", quantidade: 1000, valor: 35.0, price: "R$ 35,00" },
];
const grupoPlans: Plan[] = [
  { id: "tgg500", tier: "500 Membros (Grupo)",   quantidade: 500,  valor: 19.0, price: "R$ 19,00" },
  { id: "tgg1k",  tier: "1.000 Membros (Grupo)", quantidade: 1000, valor: 35.0, price: "R$ 35,00" },
];
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
};

function TelegramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill={AERO} d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.5 3.64 12.2c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.7L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
    </svg>
  );
}

function TelegramLanding() {
  const scrolled = useScrolledPast(50);
  const [categoria, setCategoria] = useState<Categoria>("canal");
  const [planId, setPlanId] = useState<string>("");
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blocked = useBlockedMap();

  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getStatusFn({ data: { id } });
        if (!cancelled && res.ok && res.status === "paid") { setPaid(true); playSuccessAudio(); }
      } catch (err) {
        console.error("[tg poll]", err);
      }
    };
    tick();
    const interval = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, getStatusFn]);

  const currentPlans = categoria === "canal" ? canalPlans : grupoPlans;
  const tipoBloqueado = isBlocked(blocked, "telegram", categoria);

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
    setPlanId(selected.id);
    setLoading(true);
    try {
      const res = await criarPedidoFn({
        data: {
          instagram_user: parsed.data.profile,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: "cliente@telegram.boostygram.com",
          rede_social: "telegram",
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
    <MobileFrame bg={BG} route="/telegram">
      <FabianoBadge variant="telegram" />
      <JarvisBadge variant="telegram" />
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] z-40 transition-all duration-300 backdrop-blur-xl bg-black/70 border-b ${
          scrolled ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
        style={{ borderColor: `${AERO}66` }}
      >
        <div className="container mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TelegramIcon size={18} />
            <span className="font-bold text-sm text-white">ELITEBOOST PRIME</span>
          </div>
          <span className="text-xs" style={{ color: AERO }}>TELEGRAM ⚡</span>
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

      <section id="tg-pedido" className="py-12 border-y" style={{ borderColor: `${AERO}44`, background: "#0d0d0e" }}>
        <div className="container mx-auto px-4 sm:px-6 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Finalizar pedido</h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Cole o link público do seu {categoria} no Telegram (ex: https://t.me/seucanal).
          </p>
          <div className="mt-6 rounded-2xl p-6 space-y-5"
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
            <CouponField accent={AERO} />
            <Button
              type="button"
              size="lg"
              disabled={loading || !planId || tipoBloqueado}
              onClick={() => {
                const sel = allPlans.find((p) => p.id === planId);
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
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border-0"
          style={{ background: BG, border: `1px solid ${AERO}`, boxShadow: `0 0 40px ${AERO}88` }}>
          {paid ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-white">🎉 Pagamento confirmado!</DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  Pedido enviado. Entrega gradual nos próximos minutos.
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
              <ViralShare route="/telegram" />
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
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3" style={{ boxShadow: `0 0 25px ${AERO}aa` }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" width={220} height={220} className="block" />
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
      <BottomNav active="/telegram" />
    </MobileFrame>
  );
}
