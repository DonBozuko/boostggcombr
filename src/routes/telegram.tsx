import { FabianoBadge } from "@/components/FabianoBadge";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Users } from "lucide-react";

const AERO = "#00CCFF";
const BG = "#0a0a0a";

export const Route = createFileRoute("/telegram")({
  head: () => {
    const title = "Comprar Membros para Grupo e Canal do Telegram | Boostygram";
    const description = "Em breve: compra de membros reais para grupos e canais do Telegram com entrega via Pix automática.";
    const url = "https://boostygram.lovable.app/telegram";
    return {
      meta: [
        { title }, { name: "description", content: description },
        { name: "keywords", content: "comprar membros telegram, comprar inscritos canal telegram, smm telegram brasil" },
        { property: "og:title", content: title }, { property: "og:description", content: description },
        { property: "og:url", content: url }, { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TelegramLanding,
});

type Plan = { id: string; tier: string; price: string };
const plans: Plan[] = [
  { id: "tgm500", tier: "500 Membros",   price: "R$ 19,00" },
  { id: "tgm1k",  tier: "1.000 Membros", price: "R$ 35,00" },
];

function TelegramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill={AERO} d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.5 3.64 12.2c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.7L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
    </svg>
  );
}

function TelegramLanding() {
  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <FabianoBadge />
      <header className="container mx-auto px-6 pt-10 pb-6 text-center">
        <div className="mx-auto mb-6 size-20 rounded-2xl grid place-items-center"
          style={{ background: BG, boxShadow: `0 0 30px ${AERO}, 0 0 60px ${AERO}aa`, border: `1px solid ${AERO}` }}>
          <TelegramIcon size={42} />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span style={{ color: "#fff", textShadow: `0 0 18px ${AERO}` }}>BOOSTYGRAM</span>{" "}
          <span style={{ color: AERO, textShadow: `0 0 18px ${AERO}` }}>| TELEGRAM ⚡</span>
        </h1>
        <p className="mt-4 text-zinc-300 max-w-xl mx-auto">Membros reais para canais e grupos · entrega automática via Pix</p>
      </header>

      <div className="container mx-auto px-4 max-w-2xl">
        <div className="rounded-2xl p-4 text-center text-sm font-semibold"
          style={{ background: `${AERO}11`, border: `1px solid ${AERO}66`, color: AERO, boxShadow: `0 0 20px ${AERO}33` }}>
          ⚙️ Estamos em fase final de homologação dos pacotes. Disponível em breve.
        </div>
      </div>

      <section className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((p) => (
            <div key={p.id} className="relative rounded-2xl p-6 flex flex-col items-center text-center opacity-70"
              style={{ background: "#0f0f10", border: `1px solid ${AERO}66`, boxShadow: `0 0 24px ${AERO}33` }}>
              <div className="mb-4 size-16 rounded-2xl grid place-items-center"
                style={{ background: BG, border: `1px solid ${AERO}`, boxShadow: `0 0 24px ${AERO}, 0 0 40px ${AERO}aa` }}>
                <Users className="size-7" style={{ color: AERO }} strokeWidth={2.2} />
              </div>
              <h3 className="text-xl font-bold">{p.tier}</h3>
              <div className="mt-3 text-4xl font-extrabold tracking-tight" style={{ color: "#fff", textShadow: `0 0 14px ${AERO}` }}>{p.price}</div>
              <p className="mt-2 text-xs text-zinc-400">Entrega gradual no canal/grupo</p>
              <button type="button" disabled
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold uppercase tracking-wide cursor-not-allowed"
                style={{ background: "#222", color: "#888", border: `1px solid ${AERO}44` }}>
                <Send className="size-4" /> Em breve
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
