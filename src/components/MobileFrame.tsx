import type { ReactNode } from "react";
import { LivePurchasesTicker } from "./LivePurchasesTicker";
import { ReviewsCarousel } from "./ReviewsCarousel";
import { TrustBadges } from "./TrustBadges";
import { BenefitsGrid } from "./BenefitsGrid";
import { WelcomeDiscountPopup } from "./WelcomeDiscountPopup";
import igLeft from "@/assets/char-ig-left.png";
import igRight from "@/assets/char-ig-right.png";
import ttLeft from "@/assets/char-tt-left.png";
import ttRight from "@/assets/char-tt-right.png";
import ytLeft from "@/assets/char-yt-left.png";
import ytRight from "@/assets/char-yt-right.png";
import tfLeft from "@/assets/char-tf-left.png";
import tfRight from "@/assets/char-tf-right.png";
import fbLeft from "@/assets/char-fb-left.png";
import fbRight from "@/assets/char-fb-right.png";
import tgLeft from "@/assets/char-tg-left.png";
import tgRight from "@/assets/char-tg-right.png";

type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego";

const characters: Partial<Record<RouteKey, { left: string; right: string; leftCta: string; rightCta: string }>> = {
  "/": { left: igLeft, right: igRight, leftCta: "Marcas reconhecem autoridade.", rightCta: "Glamour que converte parcerias." },
  "/tiktok": { left: ttLeft, right: ttRight, leftCta: "Algoritmo dominado.", rightCta: "FYP em retenção máxima." },
  "/youtube": { left: ytLeft, right: ytRight, leftCta: "WatchTime que monetiza.", rightCta: "YPP aprovado em tempo recorde." },
  "/trafego": { left: tfLeft, right: tfRight, leftCta: "SEO local que domina.", rightCta: "Visitas Google em escala." },
  "/facebook": { left: fbLeft, right: fbRight, leftCta: "Páginas que monetizam.", rightCta: "Comunidades que escalam alcance." },
  "/telegram": { left: tgLeft, right: tgRight, leftCta: "Grupos privados lotados.", rightCta: "Engajamento recorrente em canais VIP." },
};

const billboards: Record<
  RouteKey,
  { gradient: string; accent: string; title: string; sub: string; tag: string; brand: string; dominio: string }
> = {
  "/": {
    gradient:
      "radial-gradient(circle at 30% 20%, rgba(255,215,0,0.35), transparent 60%), radial-gradient(circle at 70% 80%, rgba(34,197,94,0.25), transparent 60%), #0a0a0a",
    accent: "#FFD700",
    title: "Autoridade que marcas reconhecem",
    sub: "Parcerias premium · Selo de prova social · Crescimento real",
    tag: "INSTAGRAM",
    brand: "INSTAGRAM",
    dominio: "Domine o Instagram",
  },
  "/tiktok": {
    gradient:
      "radial-gradient(circle at 25% 25%, rgba(0,242,254,0.35), transparent 60%), radial-gradient(circle at 75% 75%, rgba(254,9,121,0.35), transparent 60%), #0a0a0a",
    accent: "#00f2fe",
    title: "Algoritmo a seu favor",
    sub: "Views explosivas · Retenção alta · FYP garantido",
    tag: "TIKTOK",
    brand: "TIKTOK",
    dominio: "Domine o TikTok",
  },
  "/youtube": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(255,0,0,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(255,0,0,0.2), transparent 60%), #0a0a0a",
    accent: "#FF0000",
    title: "Monetização em tempo recorde",
    sub: "Inscritos reais · Horas de WatchTime · Aprovação YPP",
    tag: "YOUTUBE",
    brand: "YOUTUBE",
    dominio: "Domine o YouTube",
  },
  "/facebook": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(24,119,242,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(24,119,242,0.2), transparent 60%), #0a0a0a",
    accent: "#1877F2",
    title: "Presença que converte",
    sub: "Seguidores reais · Engajamento estável · Confiança da marca",
    tag: "FACEBOOK",
    brand: "FACEBOOK",
    dominio: "Domine o Facebook",
  },
  "/telegram": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(0,181,226,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(0,181,226,0.2), transparent 60%), #0a0a0a",
    accent: "#00B5E2",
    title: "Comunidades que vendem",
    sub: "Membros reais · Canais aquecidos · Cross-sell instantâneo",
    tag: "TELEGRAM",
    brand: "TELEGRAM",
    dominio: "Domine o Telegram",
  },
  "/trafego": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(124,58,237,0.3), transparent 60%), #0a0a0a",
    accent: "#A855F7",
    title: "SEO local que domina o Google",
    sub: "Visitas orgânicas · Autoridade · Conversão sustentável",
    tag: "TRÁFEGO",
    brand: "TRÁFEGO WEB",
    dominio: "Domine o Tráfego Web",
  },
};

function RouteHeader({ brand, dominio, accent }: { brand: string; dominio: string; accent: string }) {
  return (
    <header
      className="px-3 pt-2 pb-1 text-center select-none"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      <span
        className="inline-block text-[10px] font-bold tracking-[0.45em] uppercase border rounded-full px-3 py-0.5"
        style={{
          color: accent,
          borderColor: `${accent}55`,
          background: "rgba(255,255,255,0.03)",
          textShadow: `0 0 8px ${accent}`,
        }}
      >
        {brand}
      </span>
      <h1
        className="mt-1.5 text-[20px] sm:text-[22px] font-extrabold tracking-tight text-white leading-tight"
        style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", letterSpacing: "-0.01em" }}
      >
        {dominio}
      </h1>
    </header>
  );
}

function Billboard({
  side,
  data,
  character,
  cta,
}: {
  side: "left" | "right";
  data: (typeof billboards)[RouteKey];
  character?: string;
  cta?: string;
}) {
  return (
    <aside
      aria-hidden="true"
      className="hidden lg:block fixed top-1/2 -translate-y-1/2 z-0 h-[92vh] w-[calc((100vw-450px)/2)] max-w-[560px] overflow-hidden pointer-events-none"
      style={{
        background: data.gradient,
        left: side === "left" ? 0 : "auto",
        right: side === "right" ? 0 : "auto",
      }}
    >
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          boxShadow:
            "inset 0 0 120px rgba(0,0,0,0.85), inset 0 0 40px rgba(0,0,0,0.6)",
        }}
      />
      {/* CTA harmonizado no topo, acima da cabeça do personagem */}
      <div
        className={`absolute top-10 z-[1] max-w-[280px] px-6 text-center ${
          side === "left" ? "right-4" : "left-4"
        }`}
      >
        <span
          className="text-[10px] font-black tracking-[0.4em]"
          style={{ color: data.accent, textShadow: `0 0 12px ${data.accent}` }}
        >
          {data.tag}
        </span>
        <h2 className="text-2xl font-black text-white mt-2 leading-tight">
          {data.title}
        </h2>
        <p className="text-xs text-white/70 mt-2">{data.sub}</p>
        {cta && (
          <p
            className="text-[11px] font-bold mt-3 tracking-wide"
            style={{ color: data.accent }}
          >
            ✦ {cta}
          </p>
        )}
      </div>
      {character && (
        <img
          src={character}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          className={`absolute bottom-0 h-[75vh] max-h-[800px] object-contain pointer-events-none z-[1] ${
            side === "left" ? "right-0 translate-x-[8%]" : "left-0 -translate-x-[8%]"
          }`}
          style={{ filter: `drop-shadow(0 20px 40px rgba(0,0,0,0.9)) drop-shadow(0 0 30px ${data.accent}55)` }}
        />
      )}
    </aside>
  );
}



export function MobileFrame({
  bg = "#0a0a0a",
  route = "/",
  children,
}: {
  bg?: string;
  route?: RouteKey;
  children: ReactNode;
}) {
  const data = billboards[route] ?? billboards["/"];
  const chars = characters[route];
  return (
    <div
      className="fixed inset-0 h-[100dvh] w-screen overflow-hidden flex justify-center"
      style={{ background: "#050505", touchAction: "none", overscrollBehavior: "none" }}
    >
      <style>{`
        html, body { overflow: hidden !important; overscroll-behavior: none !important; height: 100%; margin: 0; }

        .mf-compact > * { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        .mf-compact section, .mf-compact header { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        .mf-compact .space-y-5 > * + * { margin-top: 0.6rem !important; }
        .mf-compact .space-y-6 > * + * { margin-top: 0.7rem !important; }
        .mf-compact .gap-6 { gap: 0.7rem !important; }
        .mf-compact .gap-5 { gap: 0.6rem !important; }
        .mf-compact .p-6 { padding: 0.75rem !important; }
        .mf-compact .mt-6 { margin-top: 0.6rem !important; }
        .mf-compact .mt-10 { margin-top: 0.85rem !important; }
        .mf-compact { font-size: 92%; }
        .mf-scroll { scrollbar-gutter: stable both-edges; scrollbar-color: rgba(255,255,255,0.35) transparent; scrollbar-width: thin; }
        .mf-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .mf-scroll::-webkit-scrollbar-track { background: transparent; }
        .mf-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2)); border-radius: 999px; }
        .mf-scroll::-webkit-scrollbar-corner { background: transparent; }
      `}</style>
      <Billboard side="left" data={data} character={chars?.left} cta={chars?.leftCta} />
      <div
        className="w-full sm:max-w-full md:max-w-3xl lg:max-w-5xl xl:max-w-7xl h-[100dvh] text-white shadow-[0_0_60px_rgba(0,0,0,0.95)] relative overflow-hidden z-10 flex flex-col font-sans"
        style={{ background: bg, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif" }}
      >

        <RouteHeader brand={data.brand} dominio={data.dominio} accent={data.accent} />
        <WelcomeDiscountPopup route={route} />
        <div className="mf-scroll mf-compact flex-1 min-h-0 overflow-y-auto overflow-x-auto flex flex-col">
          {children}
        </div>
        <div className="shrink-0">
          <TrustBadges accent={data.accent} />
          <ReviewsCarousel accent={data.accent} />
          <LivePurchasesTicker accent={data.accent} />
          <BenefitsGrid route={route} accent={data.accent} />
          <footer
            className="mt-0.5 mb-1 px-3 text-center select-none"
            aria-label="Versão de lançamento"
          >
            <span
              className="inline-block text-[8px] tracking-[0.35em] font-mono uppercase text-white/40 border border-white/10 rounded-full px-2 py-0.5"
              style={{ textShadow: "0 0 5px rgba(255,255,255,0.15)" }}
            >
              Versão v1.0.0-LAUNCH
            </span>
          </footer>
        </div>

      </div>
      <Billboard side="right" data={data} character={chars?.right} cta={chars?.rightCta} />
    </div>
  );
}
