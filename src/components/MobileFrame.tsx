import type { ReactNode } from "react";

type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego";

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
}: {
  side: "left" | "right";
  data: (typeof billboards)[RouteKey];
}) {
  return (
    <aside
      aria-hidden="true"
      className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
      style={{ background: data.gradient }}
    >
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          boxShadow:
            "inset 0 0 120px rgba(0,0,0,0.85), inset 0 0 40px rgba(0,0,0,0.6)",
        }}
      />
      <div
        className={`relative z-10 max-w-xs px-8 text-${side === "left" ? "right" : "left"}`}
      >
        <span
          className="text-[10px] font-black tracking-[0.4em]"
          style={{ color: data.accent, textShadow: `0 0 12px ${data.accent}` }}
        >
          {data.tag}
        </span>
        <h2 className="text-3xl font-black text-white mt-3 leading-tight">
          {data.title}
        </h2>
        <p className="text-sm text-white/70 mt-3">{data.sub}</p>
      </div>
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
  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ background: "#050505" }}
    >
      <Billboard side="left" data={data} />
      <div
        className="w-full sm:max-w-full md:max-w-[450px] min-h-screen text-white shadow-[0_0_60px_rgba(0,0,0,0.95)] relative pb-20 overflow-x-hidden"
        style={{ background: bg }}
      >
        {children}
      </div>
      <Billboard side="right" data={data} />
    </div>
  );
}
