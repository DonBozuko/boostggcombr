import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Instagram, Zap, ShieldCheck, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { criarPedido } from "@/lib/pedidos.functions";
import { getPricingGrid } from "@/lib/pricing.functions";
import { getUtmParams } from "@/lib/utm";
import { trackInitiateCheckout } from "@/lib/tiktok-pixel";
import { OrderBumpDialog, findUpgrade, type BumpPlan } from "@/components/OrderBumpDialog";
import { buildProductJsonLd } from "@/lib/seo-jsonld";

const PROMO_URL = "https://www.boostgg.com.br/promo-5reais";
const PROMO_DESC =
  "Promoção relâmpago: 100 seguidores no Instagram por R$5 via Pix. Cupom PRIME15 dá mais 15% off. Entrega em minutos.";

export const Route = createFileRoute("/promo-5reais")({
  head: () => ({
    meta: [
      { title: "100 Seguidores no Instagram por R$5 — BoostGG" },
      { name: "description", content: PROMO_DESC },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "100 Seguidores por R$5 — Pix instantâneo" },
      { property: "og:description", content: "Teste real. R$5 no Pix, 100 seguidores em minutos. Cupom PRIME15." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: PROMO_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PROMO_URL }],
    scripts: [buildProductJsonLd({ network: "Instagram (Promo R$5)", url: PROMO_URL, description: PROMO_DESC })],
  }),
  component: Promo5Page,
});

const PACOTE_ID = "p100";
// v337 — preço-base vem do catálogo (Autoridade de Preço). O valor abaixo é só
// fallback de SSR; ao hidratar, o real de `pricing_items` assume.
const PRECO_BASE_FALLBACK = 5.5;
const CUPOM = "PRIME15";
const DESCONTO = 0.85;

function Promo5Page() {
  const criar = useServerFn(criarPedido);
  const fetchGrid = useServerFn(getPricingGrid);
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [whats, setWhats] = useState("");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<{ code: string; base64: string; valor: string } | null>(null);
  const [allPlans, setAllPlans] = useState<BumpPlan[]>([]);
  const [bumpOpen, setBumpOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<null | (() => Promise<void>)>(null);
  const [precoBase, setPrecoBase] = useState(PRECO_BASE_FALLBACK);
  const PRECO_FINAL = +(precoBase * DESCONTO).toFixed(2);

  useEffect(() => {
    fetchGrid({ data: { category: "instagram:seguidores" } })
      .then((g) => {
        const plans: BumpPlan[] = (g?.items ?? []).map((it: { id: string; quantidade: number; valor: number; price: string }) => ({
          id: it.id, quantidade: it.quantidade, valor: it.valor, price: it.price, tier: it.id,
        }));
        setAllPlans(plans);
        const base = plans.find((pl) => pl.id === PACOTE_ID);
        if (base && base.valor > 0) setPrecoBase(base.valor);
      })
      .catch(() => { /* fallback: sem bump, fluxo normal */ });
  }, [fetchGrid]);

  const currentPlan: BumpPlan = {
    id: PACOTE_ID, quantidade: 100, valor: precoBase,
    price: `R$ ${precoBase.toFixed(2).replace(".", ",")}`, tier: PACOTE_ID,
  };
  const bumpAvailable = allPlans.length > 0 && !!findUpgrade(currentPlan, allPlans);

  const doCreate = async (withBump: boolean) => {
    setLoading(true);
    try {
      const utm = getUtmParams();
      const r = await criar({
        data: {
          instagram_user: instagram.replace(/^@/, "").trim(),
          pacote: PACOTE_ID,
          quantidade: 100,
          valor: precoBase,
          email: email.trim(),
          whatsapp_contato: whats.trim(),
          rede_social: "instagram",
          cupom: CUPOM,
          bump_upgrade: withBump,
          utm_source: utm.utm_source ?? "promo5",
          utm_medium: utm.utm_medium ?? "landing",
          utm_campaign: utm.utm_campaign ?? "promo-5reais",
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
        value: Number(r.valorCobrado ?? PRECO_FINAL),
        contentId: PACOTE_ID,
        contentName: withBump ? "bump upgrade instagram" : "100 seguidores instagram",
      });
      setPix({
        code: r.qrCode ?? "",
        base64: r.qrCodeBase64 ?? "",
        valor: r.valorFormatado ?? `R$ ${PRECO_FINAL.toFixed(2).replace(".", ",")}`,
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
    if (bumpAvailable) {
      setPendingForm(() => () => doCreate(true));
      setBumpOpen(true);
      return;
    }
    await doCreate(false);
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0033] via-[#0d0018] to-black text-white overflow-x-hidden">
      {/* Glow bg */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-lg mx-auto px-5 pt-10 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold tracking-wider uppercase animate-pulse">
            🔥 Oferta relâmpago · hoje
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl font-black text-center leading-tight"
        >
          <span className="block text-white">100 Seguidores</span>
          <span className="block bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            por R$ 5
          </span>
          <span className="block text-white/80 text-2xl sm:text-3xl mt-2">
            no Pix. Direto.
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 mx-auto max-w-sm rounded-2xl border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/10 to-purple-900/20 p-4 text-center"
        >
          <div className="text-xs text-fuchsia-200 uppercase tracking-widest font-semibold">
            Cupom já aplicado
          </div>
          <div className="mt-1 text-2xl font-black text-white">{CUPOM}</div>
          <div className="mt-1 text-sm text-white/70">
            15% off automático · você paga só{" "}
            <span className="text-fuchsia-300 font-bold">
              R$ {PRECO_FINAL.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </motion.div>

        <ul className="mt-8 space-y-3 text-white/90">
          {[
            { icon: Zap, txt: "Entrega em minutos após o Pix" },
            { icon: ShieldCheck, txt: "Perfil público · nada de senha" },
            { icon: Check, txt: "Reposição grátis se cair em 30 dias" },
          ].map(({ icon: Icon, txt }, i) => (
            <motion.li
              key={txt}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="flex items-center gap-3 text-sm"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-fuchsia-300" />
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
            <Label className="text-white/80 text-xs uppercase tracking-wider">
              Seu @ do Instagram
            </Label>
            <div className="relative mt-1">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-400" />
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
            <Label className="text-white/80 text-xs uppercase tracking-wider">
              E-mail (recibo do Pix)
            </Label>
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
            <Label className="text-white/80 text-xs uppercase tracking-wider">
              WhatsApp (envio do Pix)
            </Label>
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
            disabled={loading}
            className="w-full h-14 text-base font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400 shadow-[0_0_40px_-10px_rgba(250,204,21,0.6)]"
          >
            {loading ? (
              "Gerando Pix..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                PAGAR R$ {PRECO_FINAL.toFixed(2).replace(".", ",")} NO PIX
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
          <div className="max-w-sm w-full rounded-2xl border border-fuchsia-400/40 bg-gradient-to-b from-[#1a0033] to-black p-6 text-center">
            <div className="text-fuchsia-300 text-xs uppercase tracking-widest font-bold">
              Pix gerado
            </div>
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
              className="mt-4 w-full h-12 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-sm"
            >
              COPIAR CÓDIGO PIX
            </button>
            <p className="mt-3 text-[11px] text-white/50">
              Após o pagamento, envio automático em minutos.
            </p>
            <button
              onClick={() => setPix(null)}
              className="mt-2 text-xs text-white/40 underline"
            >
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
