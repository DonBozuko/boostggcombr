import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { criarPedido } from "@/lib/pedidos.functions";
import { CARD_SURCHARGE, CARD_MAX_BRL, cardAmount, formatBRL } from "@/lib/card-pricing";

export type CardPayload = {
  instagram_user: string;
  pacote: string;
  quantidade: number;
  valor: number;
  email: string;
  whatsapp_contato?: string;
  rede_social?: "instagram" | "tiktok" | "youtube" | "facebook" | "trafego" | "telegram" | "kwai";
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  cupom?: string | null;
  bump_upgrade?: boolean;
};
type Payload = CardPayload;

/**
 * v270 — Botão de pagamento com cartão (Mercado Pago Checkout Pro).
 *
 * Pix continua sendo o caminho principal e mais barato. O cartão existe para
 * não perder a venda de quem não usa Pix — com a taxa repassada, a margem
 * do pedido é a mesma.
 */
export default function CardPayOption({
  buildPayload,
  disabled,
  valorPix,
}: {
  buildPayload: () => Payload | null;
  disabled?: boolean;
  valorPix?: number;
}) {
  const criar = useServerFn(criarPedido);
  const [loading, setLoading] = useState(false);

  const acimaDoTeto = typeof valorPix === "number" && cardAmount(valorPix) > CARD_MAX_BRL;
  if (acimaDoTeto) return null;

  const onClick = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setLoading(true);
    try {
      const res = (await criar({ data: { ...payload, metodo: "cartao" } })) as
        | { ok: true; checkoutUrl?: string }
        | { ok: false; error?: string };
      if (!res?.ok || !("checkoutUrl" in res) || !res.checkoutUrl) {
        const err = (res as { error?: string })?.error;
        if (err === "CARD_LIMIT") {
          toast.error(`Cartão disponível até ${formatBRL(CARD_MAX_BRL)}. Para este valor, pague no Pix.`);
        } else if (err === "CARD_MIN") {
          toast.error("Valor abaixo do mínimo do cartão. Use o Pix.");
        } else {
          toast.error("Não foi possível abrir o pagamento com cartão. Tente o Pix.");
        }
        return;
      }
      window.location.assign(res.checkoutUrl);
    } catch {
      toast.error("Erro ao abrir o cartão. Tente o Pix.");
    } finally {
      setLoading(false);
    }
  };

  const preco = typeof valorPix === "number" ? cardAmount(valorPix) : null;

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full h-12 rounded-xl border border-border bg-card/60 text-sm font-semibold text-zinc-200 hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Abrindo cartão..." : `💳 Pagar com cartão${preco ? ` — ${formatBRL(preco)}` : ""}`}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-zinc-400">
        Pix é o melhor preço. No cartão há acréscimo de {Math.round(CARD_SURCHARGE * 100)}% (taxa da operadora).
      </p>
    </div>
  );
}
