import type { ReactNode } from "react";
import { LivePurchasesTicker } from "./LivePurchasesTicker";
import { ReviewsCarousel } from "./ReviewsCarousel";
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
  { gradient: string; accent: string; title: string; sub: string; tag: string }
> = {
  "/": {
    gradient:
      "radial-gradient(circle at 30% 20%, rgba(255,215,0,0.35), transparent 60%), radial-gradient(circle at 70% 80%, rgba(34,197,94,0.25), transparent 60%), #0a0a0a",
    accent: "#FFD700",
    title: "Autoridade que marcas reconhecem",
    sub: "Parcerias premium · Selo de prova social · Crescimento real",
    tag: "INSTAGRAM",
  },
  "/tiktok": {
    gradient:
      "radial-gradient(circle at 25% 25%, rgba(0,242,254,0.35), transparent 60%), radial-gradient(circle at 75% 75%, rgba(254,9,121,0.35), transparent 60%), #0a0a0a",
    accent: "#00f2fe",
    title: "Algoritmo a seu favor",
    sub: "Views explosivas · Retenção alta · FYP garantido",
    tag: "TIKTOK",
  },
  "/youtube": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(255,0,0,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(255,0,0,0.2), transparent 60%), #0a0a0a",
    accent: "#FF0000",
    title: "Monetização em tempo recorde",
    sub: "Inscritos reais · Horas de WatchTime · Aprovação YPP",
    tag: "YOUTUBE",
  },
  "/facebook": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(24,119,242,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(24,119,242,0.2), transparent 60%), #0a0a0a",
    accent: "#1877F2",
    title: "Presença que converte",
    sub: "Seguidores reais · Engajamento estável · Confiança da marca",
    tag: "FACEBOOK",
  },
  "/telegram": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(0,181,226,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(0,181,226,0.2), transparent 60%), #0a0a0a",
    accent: "#00B5E2",
    title: "Comunidades que vendem",
    sub: "Membros reais · Canais aquecidos · Cross-sell instantâneo",
    tag: "TELEGRAM",
  },
  "/trafego": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(124,58,237,0.3), transparent 60%), #0a0a0a",
    accent: "#A855F7",
    title: "SEO local que domina o Google",
    sub: "Visitas orgânicas · Autoridade · Conversão sustentável",
    tag: "TRÁFEGO",
  },
};

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
      className="min-h-screen flex justify-center"
      style={{ background: "#050505" }}
    >
      <Billboard side="left" data={data} character={chars?.left} cta={chars?.leftCta} />
      <div
        className="w-full sm:max-w-full md:max-w-[450px] min-h-screen text-white shadow-[0_0_60px_rgba(0,0,0,0.95)] relative pb-20 overflow-x-hidden z-10"
        style={{ background: bg }}
      >
        {children}
        <footer
          className="mt-8 mb-4 px-4 text-center select-none"
          aria-label="Versão de lançamento"
        >
          <span
            className="inline-block text-[10px] tracking-[0.45em] font-mono uppercase text-white/40 border border-white/10 rounded-full px-3 py-1"
            style={{ textShadow: "0 0 6px rgba(255,255,255,0.15)" }}
          >
            Versão v1.0.0-LAUNCH
          </span>
        </footer>
      </div>
      <Billboard side="right" data={data} character={chars?.right} cta={chars?.rightCta} />
    </div>
  );
}
