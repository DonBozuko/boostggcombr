import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Instagram, Zap, ShieldCheck, Check, Send, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { criarPedido } from "@/lib/pedidos.functions";
import { getPricingGrid } from "@/lib/pricing.functions";
import { getUtmParams } from "@/lib/utm";
import { trackInitiateCheckout } from "@/lib/tiktok-pixel";
import { OrderBumpDialog, findUpgrade, type BumpPlan } from "@/components/OrderBumpDialog";

export const Route = createFileRoute("/kit-creator")({
  head: () => ({
    meta: [
      { title: "Kit Creator — 1.000 Seguidores Instagram | BoostGG" },
      {
        name: "description",
        content:
          "Pacote Creator: 1.000 seguidores reais no Instagram via Pix. Entrega em minutos, reposição 30 dias, sem senha. Cupom PRIME15 aplicado.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Kit Creator — 1.000 Seguidores Instagram" },
      { property: "og:description", content: "Cresce de verdade com 1k seguidores no Pix. Reposição garantida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KitCreatorPage,
});

// v1 — Kit Creator landing: ticket alto (p1k IG), OrderBump ativo,
// preço dinâmico do grid. URL alvo pra ads TikTok (ticket ≥ R$30 = CPA viável).
const PACOTE_ID = "p1k";
const QTD = 1000;
const CUPOM = "PRIME15";

function KitCreatorPage() {
  const criar = useServerFn(criarPedido);
  const fetchGrid = useServerFn(getPricingGrid);
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [whats, setWhats] = useState("");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<{ code: string; base64: string; valor: string } | null>(null);
  const [allPlans, setAllPlans] = useState<BumpPlan[]>([]);
  const [priceBase, setPriceBase] = useState<number | null>(null);
  const [bumpOpen, setBumpOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<null | (() => Promise<void>)>(null);

  useEffect(() => {
    fetchGrid({ data: { category: "instagram:seguidores" } })
      .then((g) => {
        // v185 — Aplica PRIME15 (-15%) no allPlans + priceBase pra o OrderBump
        // exibir o valor REAL cobrado (server soma bump-20% + cupom-15%).
        const plans: BumpPlan[] = (g?.items ?? []).map((it: { id: string; quantidade: number; valor: number; price: string }) => {
          const v = +(it.valor * 0.85).toFixed(2);
          return { id: it.id, quantidade: it.quantidade, valor: v, price: `R$ ${v.toFixed(2).replace(".", ",")}`, tier: it.id };
        });
        setAllPlans(plans);
        const base = plans.find((p) => p.id === PACOTE_ID);
        if (base) setPriceBase(base.valor);
      })
      .catch(() => { /* fallback: sem grid, mostra loading */ });
  }, [fetchGrid]);

  const currentPlan = useMemo<BumpPlan | null>(() => {
    if (priceBase == null) return null;
    return {
      id: PACOTE_ID, quantidade: QTD, valor: priceBase,
      price: `R$ ${priceBase.toFixed(2).replace(".", ",")}`, tier: PACOTE_ID,
    };
  }, [priceBase]);

  // priceBase já vem com PRIME15 aplicado; precoFinal = priceBase.
  const precoFinal = priceBase;
  const priceOriginal = priceBase != null ? +(priceBase / 0.85).toFixed(2) : null;
  const bumpAvailable = !!(currentPlan && allPlans.length > 0 && findUpgrade(currentPlan, allPlans));

  const doCreate = async (withBump: boolean) => {
    if (priceBase == null) return;
    setLoading(true);
    try {
      const utm = getUtmParams();
      const r = await criar({
        data: {
          instagram_user: instagram.replace(/^@/, "").trim(),
          pacote: PACOTE_ID,
          quantidade: QTD,
          valor: priceOriginal ?? priceBase,
          email: email.trim(),
          whatsapp_contato: whats.trim(),
          rede_social: "instagram",
          cupom: CUPOM,
          bump_upgrade: withBump,
          utm_source: utm.utm_source ?? "kit-creator",
          utm_medium: utm.utm_medium ?? "landing",
          utm_campaign: utm.utm_campaign ?? "kit-creator",
          utm_content: utm.utm_content,
          utm_term: utm.utm_term,
        },
      });
      if (!r?.ok) {
        toast.error("Falha ao gerar Pix. Tenta de novo.");
        return;
      }
      trackInitiateCheckout({
        orderId: r.pedidoId ?? "",
        value: Number(r.valorCobrado ?? precoFinal ?? priceBase),
        contentId: PACOTE_ID,
        contentName: withBump ? "kit creator bump" : "kit creator 1k",
      });
      setPix({
        code: r.qrCode ?? "",
        base64: r.qrCodeBase64 ?? "",
        valor: r.valorFormatado ?? `R$ ${(precoFinal ?? priceBase).toFixed(2).replace(".", ",")}`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar");
    } finally {
      setLoading(false);
      setBumpOpen(false);
      setPendingForm(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagram || !email || !whats) {
      toast.error("Preenche todos os campos");
      return;
    }
    if (priceBase == null) {
      toast.error("Aguarda carregar o preço...");
      return;
    }
    if (bumpAvailable) {
      setPendingForm(() => () => doCreate(true));
      setBumpOpen(true);
      return;
    }
    await doCreate(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0028] via-[#0d0018] to-black text-white overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-lg mx-auto px-5 pt-10 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider uppercase flex items-center gap-1">
            <Crown className="w-3 h-3" /> Kit Creator · Ticket Prime
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl font-black text-center leading-tight"
        >
          <span className="block text-white">1.000 Seguidores</span>
          <span className="block bg-gradient-to-r from-amber-300 to-fuchsia-400 bg-clip-text text-transparent">
            Instagram
          </span>
          <span className="block text-white/80 text-2xl sm:text-3xl mt-2">
            Pix rápido · reposição 30 dias
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 mx-auto max-w-sm rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-fuchsia-900/20 p-4 text-center"
        >
          <div className="text-xs text-amber-200 uppercase tracking-widest font-semibold">
            Cupom PRIME15 aplicado
          </div>
          <div className="mt-1 text-4xl font-black text-white">
            {precoFinal != null ? `R$ ${precoFinal.toFixed(2).replace(".", ",")}` : "..."}
          </div>
          {priceBase != null && precoFinal != null && (
            <div className="mt-1 text-sm text-white/60 line-through">
              R$ {priceBase.toFixed(2).replace(".", ",")}
            </div>
          )}
        </motion.div>

        <ul className="mt-8 space-y-3 text-white/90">
          {[
            { icon: Zap, txt: "Entrega em minutos após confirmação Pix" },
            { icon: ShieldCheck, txt: "Perfil público · sem senha · 100% seguro" },
            { icon: Check, txt: "Reposição grátis por 30 dias" },
            { icon: Crown, txt: "Suporte prioritário no WhatsApp" },
          ].map(({ icon: Icon, txt }, i) => (
            <motion.li
              key={txt}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="flex items-center gap-3 text-sm"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-amber-300" />
              </span>
              <span>{txt}</span>
            </motion.li>
          ))}
        </ul>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-5 space-y-4"
        >
          <div>
            <Label className="text-white/80 text-xs uppercase tracking-wider">Seu @ do Instagram</Label>
            <div className="relative mt-1">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@seu_perfil"
                className="pl-9 bg-white/5 border-white/10 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-white/80 text-xs uppercase tracking-wider">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="mt-1 bg-white/5 border-white/10 text-white"
              required
            />
          </div>

          <div>
            <Label className="text-white/80 text-xs uppercase tracking-wider">WhatsApp</Label>
            <Input
              value={whats}
              onChange={(e) => setWhats(e.target.value)}
              placeholder="11999999999"
              className="mt-1 bg-white/5 border-white/10 text-white"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || priceBase == null}
            className="w-full h-14 text-base font-black bg-gradient-to-r from-amber-400 to-fuchsia-500 text-black hover:from-amber-300 hover:to-fuchsia-400 shadow-[0_0_40px_-10px_rgba(250,204,21,0.6)]"
          >
            {loading ? (
              "Gerando Pix..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {precoFinal != null
                  ? `PAGAR R$ ${precoFinal.toFixed(2).replace(".", ",")} NO PIX`
                  : "CARREGANDO..."}
              </>
            )}
          </Button>

          <p className="text-center text-[11px] text-white/40">
            Pagamento processado pelo Mercado Pago · BoostGG
          </p>
        </motion.form>

        <div className="mt-8 text-center text-xs text-white/50">
          +3.500 clientes já testaram · avaliação 4.9/5
        </div>
      </main>

      {pix && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-5">
          <div className="max-w-sm w-full rounded-2xl border border-amber-400/40 bg-gradient-to-b from-[#0a0028] to-black p-6 text-center">
            <div className="text-amber-300 text-xs uppercase tracking-widest font-bold">Pix gerado</div>
            <div className="mt-1 text-3xl font-black text-white">{pix.valor}</div>
            {pix.base64 && (
              <img
                src={`data:image/png;base64,${pix.base64}`}
                alt="QR Code Pix"
                className="mt-4 mx-auto w-56 h-56 rounded-lg bg-white p-2"
              />
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(pix.code);
                toast.success("Código Pix copiado!");
              }}
              className="mt-4 w-full h-12 rounded-lg bg-gradient-to-r from-amber-400 to-fuchsia-500 text-black font-black text-sm"
            >
              COPIAR CÓDIGO PIX
            </button>
            <p className="mt-3 text-[11px] text-white/50">Após o pagamento, envio automático em minutos.</p>
            <button onClick={() => setPix(null)} className="mt-2 text-xs text-white/40 underline">
              fechar
            </button>
          </div>
        </div>
      )}

      <OrderBumpDialog
        open={bumpOpen}
        current={currentPlan}
        allPlans={allPlans}
        unitLabel="seguidores"
        loading={loading}
        onAccept={() => { if (pendingForm) pendingForm(); }}
        onDecline={() => { setBumpOpen(false); setPendingForm(null); doCreate(false); }}
      />
    </div>
  );
}
