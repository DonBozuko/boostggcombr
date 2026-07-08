import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Home } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}


export const Route = createFileRoute("/obrigado")({
  head: () => {
    const title = "Pedido Confirmado — EliteBoost Prime";
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
        <Button asChild className="w-full">
          <Link to="/"><Home className="w-4 h-4 mr-2" />Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
