import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ReviewsCarousel } from "./ReviewsCarousel";
import { TrustBadges } from "./TrustBadges";
import { BenefitsGrid } from "./BenefitsGrid";

import { TopNetworksNav } from "./TopNetworksNav";
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
import kwLeft from "@/assets/char-kw-left.png";
import kwRight from "@/assets/char-kw-right.png";

type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego" | "/kwai";

const characters: Partial<Record<RouteKey, { left: string; right: string; leftCta: string; rightCta: string }>> = {
  "/": { left: igLeft, right: igRight, leftCta: "Marcas reconhecem autoridade.", rightCta: "Glamour que converte parcerias." },
  "/tiktok": { left: ttLeft, right: ttRight, leftCta: "Algoritmo dominado.", rightCta: "FYP em retenção máxima." },
  "/youtube": { left: ytLeft, right: ytRight, leftCta: "WatchTime que monetiza.", rightCta: "YPP aprovado em tempo recorde." },
  "/trafego": { left: tfLeft, right: tfRight, leftCta: "SEO local que domina.", rightCta: "Visitas Google em escala." },
  "/facebook": { left: fbLeft, right: fbRight, leftCta: "Páginas que monetizam.", rightCta: "Comunidades que escalam alcance." },
  "/telegram": { left: tgLeft, right: tgRight, leftCta: "Grupos privados lotados.", rightCta: "Engajamento recorrente em canais VIP." },
  "/kwai": { left: kwLeft, right: kwRight, leftCta: "Kwai brasileiro em explosão.", rightCta: "Views que viram Kwai Rewards." },
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
  "/kwai": {
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(255,102,0,0.4), transparent 60%), radial-gradient(circle at 70% 70%, rgba(255,179,0,0.25), transparent 60%), #0a0a0a",
    accent: "#FF6600",
    title: "Kwai brasileiro em explosão",
    sub: "Seguidores BR · Kwai Rewards · Viralização real",
    tag: "KWAI",
    brand: "KWAI",
    dominio: "Domine o Kwai",
  },
};

function RouteHeader({
  brand,
  dominio,
  accent,
  tagline,
}: {
  brand: string;
  dominio: string;
  accent: string;
  tagline: string;
}) {
  return (
    <header
      className="px-3 pt-2 pb-1 text-center select-none"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      <div
        className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-white leading-tight"
        style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", letterSpacing: "-0.01em" }}
      >
        {dominio}
      </div>
      <p
        className="mt-1 text-[11px] sm:text-[12px] font-semibold text-white/85 max-w-[520px] mx-auto"
        style={{ textShadow: `0 0 10px ${accent}55` }}
      >
        {tagline}
      </p>
    </header>
  );
}

function Billboard({
  side,
  data,
}: {
  side: "left" | "right";
  data: (typeof billboards)[RouteKey];
}) {
  return (
    <aside
      aria-hidden="true"
      className="hidden xl:block fixed top-0 bottom-0 z-0 pointer-events-none"
      style={{
        background: data.gradient,
        left: side === "left" ? 0 : "auto",
        right: side === "right" ? 0 : "auto",
        width: "calc((100vw - 820px) / 2)",
        overflow: "visible",
      } as any}
      data-billboard={side}
    >
      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            "inset 0 0 120px rgba(0,0,0,0.85), inset 0 0 40px rgba(0,0,0,0.6)",
        }}
      />
    </aside>
  );
}


function BodyCharacters({ data, chars }: { data: (typeof billboards)[RouteKey]; chars?: { left: string; right: string } }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !chars || typeof document === "undefined") return null;

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 hidden xl:block overflow-hidden">
      <img
        src={chars.left}
        alt=""
        loading="eager"
        decoding="async"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        className="fixed bottom-0 left-0 h-[92vh] z-0 object-contain object-bottom select-none"
        style={{ width: "calc((100vw - 820px) / 2)", maxWidth: "460px" }}
      />
      <img
        src={chars.right}
        alt=""
        loading="eager"
        decoding="async"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        className="fixed bottom-0 right-0 h-[92vh] z-0 object-contain object-bottom select-none"
        style={{ width: "calc((100vw - 820px) / 2)", maxWidth: "460px", transform: "scaleX(-1)" }}
      />
    </div>,
    document.body,
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
  useEffect(() => { try { localStorage.setItem("eb_coupon", "PRIME15"); } catch {} }, []);

  return (
    <div
      className="relative min-h-screen w-screen overflow-x-hidden flex justify-center lg:items-center"
      style={{ background: "#050505", WebkitOverflowScrolling: "touch" as any }}
    >
      <style>{`
        html, body { max-width: none !important; overflow-x: hidden !important; overflow-y: visible !important; overscroll-behavior-y: auto !important; height: auto !important; margin: 0; zoom: 1 !important; transform: none !important; touch-action: pan-y !important; -webkit-overflow-scrolling: touch; }
        /* v88 — Strict CSS Scale Rollback: removido font-size:92% e paddings
           compactos que davam a impressão de "zoom reverso". Shell volta ao
           tamanho nativo de alta conversão. */
        .mf-compact { font-size: 100%; }
        .mf-scroll { scrollbar-gutter: stable both-edges; scrollbar-color: rgba(255,255,255,0.35) transparent; scrollbar-width: thin; }
        .mf-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .mf-scroll::-webkit-scrollbar-track { background: transparent; }
        .mf-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2)); border-radius: 999px; }
        .mf-scroll::-webkit-scrollbar-corner { background: transparent; }
        @media (min-height: 700px) and (min-width: 1024px) {
          .mf-shell { height: auto !important; min-height: 100vh !important; max-height: none !important; border-radius: 18px; }
        }
      `}</style>


      <BodyCharacters data={data} chars={chars} />
      <Billboard side="left" data={data} />
      <div
        className={`mf-shell w-full md:max-w-[640px] lg:max-w-[700px] xl:max-w-[760px] 2xl:max-w-[800px] min-h-screen h-auto text-white shadow-[0_0_60px_rgba(0,0,0,0.6)] relative overflow-visible z-10 flex flex-col font-sans bg-black/85 border-x border-white/10`}
        style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif" }}
      >

        <div className="bg-red-950/80 border border-dashed border-red-500 p-2 rounded-lg text-center mb-4 mx-3 mt-2 shrink-0" role="status" aria-live="polite" style={{ backdropFilter: "blur(8px)", boxShadow: "0 0 18px rgba(220,38,38,0.45)" }}>
          <p className="text-white font-extrabold uppercase tracking-wider text-[12px] leading-tight" style={{ textShadow: "0 0 6px rgba(0,0,0,0.9)" }}>
            🎟️ USE O CUPOM: <span style={{ color: data.accent }}>PRIME15</span> (15% OFF EM PEDIDOS ACIMA DE R$ 30)
          </p>
        </div>
        <RouteHeader brand={data.brand} dominio={data.dominio} accent={data.accent} tagline={data.title} />
        <TopNetworksNav active={route} />

        <div
          className="mf-compact flex flex-col pb-2"
          style={{ touchAction: "pan-y" }}
        >


          {children}
        </div>

        <div className="shrink-0">
          <TrustBadges accent={data.accent} />
          <ReviewsCarousel accent={data.accent} route={route} />
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
      <Billboard side="right" data={data} />
    </div>
  );
}
