import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Home, Zap, Heart, Eye, TrendingUp, Star, ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { trackCompletePayment } from "@/lib/tiktok-pixel";



declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}


export const Route = createFileRoute("/obrigado")({
  head: () => {
    const title = "Pedido Confirmado — BoostGG";
    const description = "Seu pagamento foi confirmado. Estamos processando sua entrega.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ObrigadoPage,
});

function ObrigadoPage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const orderId = params?.get("order") ?? "";
  const value = params?.get("value") ?? "";
  const tier = params?.get("tier") ?? "";

  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const numericValue = parseFloat(value) || 1.0;
    window.gtag?.("event", "conversion", {
      send_to: "AW-16655771808/jbsRCMOT8cwcEKDRi4Y-",
      value: numericValue,
      currency: "BRL",
      transaction_id: orderId,
    });
    trackCompletePayment({
      orderId,
      value: numericValue,
      contentName: tier || undefined,
    });
  }, [orderId, value, tier]);



  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Pagamento confirmado!</h1>
          <p className="mt-2 text-zinc-400">
            Recebemos seu Pix. Sua entrega já está sendo processada.
          </p>
        </div>
        {orderId && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-left space-y-1">
            <div className="text-zinc-500">Pedido</div>
            <div className="font-mono text-xs break-all">{orderId}</div>
            {tier && <div className="text-zinc-400 pt-2">Plano: <span className="text-white">{tier}</span></div>}
            {value && <div className="text-zinc-400">Valor: <span className="text-white">R$ {value}</span></div>}
          </div>
        )}
        <div className="rounded-xl border-2 border-yellow-400/40 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 p-5 text-left space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-yellow-400 uppercase text-sm tracking-wide">Turbine seu resultado</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Perfil com seguidores + curtidas + views converte <span className="text-white font-semibold">até 4x mais</span>. Complete o combo agora:
          </p>
          <div className="grid gap-2">
            <Link to="/" className="flex items-center justify-between rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 px-3 py-2.5 transition">
              <span className="flex items-center gap-2 text-sm"><Heart className="w-4 h-4 text-pink-400" /> Adicionar Curtidas</span>
              <span className="text-xs text-yellow-400 font-bold">TURBINAR →</span>
            </Link>
            <Link to="/" className="flex items-center justify-between rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 px-3 py-2.5 transition">
              <span className="flex items-center gap-2 text-sm"><Eye className="w-4 h-4 text-blue-400" /> Adicionar Visualizações</span>
              <span className="text-xs text-yellow-400 font-bold">TURBINAR →</span>
            </Link>
            <Link to="/" className="flex items-center justify-between rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 px-3 py-2.5 transition">
              <span className="flex items-center gap-2 text-sm"><TrendingUp className="w-4 h-4 text-emerald-400" /> Mais Seguidores</span>
              <span className="text-xs text-yellow-400 font-bold">TURBINAR →</span>
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-left space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-emerald-400 uppercase text-sm tracking-wide">Sua avaliação vale ouro</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Depois de receber seus seguidores, deixe uma avaliação no Trustpilot. Leva menos de 1 minuto e ajuda outras pessoas a confiarem na BoostGG.
          </p>
          <a
            href="https://br.trustpilot.com/review/boostgg.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition"
          >
            Avaliar no Trustpilot
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/"><Home className="w-4 h-4 mr-2" />Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
