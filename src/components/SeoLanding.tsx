// v200 — Componente reutilizável para landing pages SEO (keyword-alvo → CTA no checkout real).

import { BrandHeader } from "@/components/BrandHeader";
import { MobileFrame } from "@/components/MobileFrame";
import { RelatedLinks } from "@/components/RelatedLinks";
import { DeliveryTimes } from "@/components/DeliveryTimes";
import { TrustBadges } from "@/components/TrustBadges";
import { LivePurchasesTicker } from "@/components/LivePurchasesTicker";
import { CheckCircle2, Zap, Shield, Clock } from "lucide-react";
import { useLivePricingRows } from "@/hooks/useLivePricingRows";
import type { LivePricingCategory } from "@/hooks/useLivePricingRows";


export type SeoBenefit = { icon: "check" | "zap" | "shield" | "clock"; title: string; text: string };
export type SeoFaq = { q: string; a: string };
/** `id` (opcional) = pacote em pricing_items; quando presente, o preço vem vivo do catálogo. */
export type SeoPricingRow = { qty: string; price: string; note?: string; id?: string };

export interface SeoLandingProps {
  accent: string;
  h1: string;
  subtitle: string;
  ctaHref: string;
  ctaLabel: string;
  intro: string; // parágrafo principal (200-400 chars)
  benefits: SeoBenefit[];
  pricingTitle: string;
  pricing: SeoPricingRow[];
  /** v329 — categorias a consultar pra hidratar o preço real da tabela. */
  pricingCategories?: LivePricingCategory[];
  bodySections: { h2: string; body: string }[];
  faq: SeoFaq[];
}

const iconMap = { check: CheckCircle2, zap: Zap, shield: Shield, clock: Clock };

export function SeoLanding(p: SeoLandingProps) {
  const pricingRows = useLivePricingRows(
    p.pricingCategories ?? [],
    p.pricing.map((r) => ({ ...r, id: r.id ?? "" })),
  );
  // v378 — landing de busca também marca topo de funil (antes só a home marcava).
  useEffect(() => { trackFunnel("abriu_vitrine"); }, []);


  return (
    <MobileFrame bg="#0a0a0a">
      <header
        className="sticky top-0 z-50 bg-black/90 border-b"
        style={{ borderColor: `${p.accent}66` }}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <BrandHeader subtitle={p.subtitle} />
        </div>
      </header>

      <main className="px-4 py-6 max-w-3xl mx-auto text-zinc-200">
        <h1
          className="text-3xl sm:text-4xl font-black leading-tight text-center"
          style={{ color: "#fff" }}
        >
          {p.h1}
        </h1>
        <p className="mt-4 text-center text-zinc-400 text-base">{p.intro}</p>

        <div className="mt-6 flex justify-center">
          <a
            href={p.ctaHref}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-4 font-black text-base"
            style={{
              background: `linear-gradient(135deg, ${p.accent}, ${p.accent}dd)`,
              color: "#000",
              boxShadow: `0 0 24px ${p.accent}88`,
            }}
          >
            <Zap className="w-5 h-5" /> {p.ctaLabel}
          </a>
        </div>

        {/* v224 — Prova social acima da dobra */}
        <div className="mt-6 space-y-3">
          <LivePurchasesTicker accent={p.accent} />
          <TrustBadges accent={p.accent} />
        </div>

        {/* Benefícios */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {p.benefits.map((b, i) => {
            const Icon = iconMap[b.icon];
            return (
              <div
                key={i}
                className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: "#111", border: `1px solid ${p.accent}44` }}
              >
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: p.accent }} />
                <div>
                  <div className="font-bold text-white text-sm">{b.title}</div>
                  <div className="text-xs text-zinc-400 mt-1">{b.text}</div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Tabela de preços */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4">{p.pricingTitle}</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${p.accent}44` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: `${p.accent}22` }}>
                  <th className="text-left px-4 py-3 text-white">Pacote</th>
                  <th className="text-right px-4 py-3 text-white">Preço</th>
                </tr>
              </thead>
              <tbody>
                {pricingRows.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: `${p.accent}22` }}>
                    <td className="px-4 py-3">
                      <div className="text-white font-semibold">{r.qty}</div>
                      {r.note && <div className="text-xs text-zinc-500">{r.note}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: p.accent }}>
                      {r.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-center">
            <a
              href={p.ctaHref}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-black text-sm"
              style={{ background: p.accent, color: "#000" }}
            >
              Ver todos os pacotes →
            </a>
          </div>
        </section>

        {/* v220 — Prazos reais de entrega (transparência anti-chargeback) */}
        <DeliveryTimes
          rede={
            /tiktok/i.test(p.ctaHref) ? "tiktok"
            : /youtube/i.test(p.ctaHref) ? "youtube"
            : /kwai/i.test(p.ctaHref) ? "kwai"
            : /twitter|x-/i.test(p.ctaHref) ? "twitter"
            : /instagram/i.test(p.ctaHref) ? "instagram"
            : "generic"
          }
          accent={p.accent}
        />

        {/* Corpo (H2 + parágrafos) */}
        {p.bodySections.map((s, i) => (
          <section key={i} className="mt-10">
            <h2 className="text-xl font-bold text-white mb-3">{s.h2}</h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-sm">{s.body}</p>
          </section>
        ))}

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4">Perguntas frequentes</h2>
          <div className="space-y-3">
            {p.faq.map((f, i) => (
              <details
                key={i}
                className="rounded-xl p-4"
                style={{ background: "#111", border: `1px solid ${p.accent}33` }}
              >
                <summary className="cursor-pointer font-semibold text-white text-sm">{f.q}</summary>
                <p className="mt-2 text-zinc-400 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Ferramentas grátis — apresentação clara pro cliente saber o que é */}
        <section className="mt-10">
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: `linear-gradient(135deg, ${p.accent}11, #0a0a0a 60%)`,
              border: `1px solid ${p.accent}55`,
            }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                style={{ background: p.accent, color: "#000" }}
              >
                🎁 100% Grátis
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/90">
                Sem login
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/90">
                Sem cadastro
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/90">
                Uso ilimitado
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
              Ferramentas grátis pra você usar antes de comprar
            </h2>
            <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
              A gente liberou 3 ferramentas de verdade pra você testar seu perfil,
              medir engajamento e criar legendas — <span className="text-white font-semibold">sem pagar nada, sem pedir sua senha</span>.
              Serve pra qualquer creator, mesmo quem nunca comprou aqui.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <a
                href="/ferramentas/contador-seguidores"
                className="group rounded-xl p-4 block hover:scale-[1.02] transition-transform"
                style={{ background: "#111", border: `1px solid ${p.accent}55` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👥</span>
                  <div className="font-bold text-white text-sm">Contador de seguidores</div>
                </div>
                <div className="text-zinc-400 text-xs leading-relaxed mb-2">
                  Digite o @ e veja quantos seguidores qualquer perfil público tem, em tempo real.
                </div>
                <div className="text-[11px] font-bold" style={{ color: p.accent }}>
                  Abrir grátis →
                </div>
              </a>
              <a
                href="/ferramentas/calculadora-engajamento-instagram"
                className="group rounded-xl p-4 block hover:scale-[1.02] transition-transform"
                style={{ background: "#111", border: `1px solid ${p.accent}55` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <div className="font-bold text-white text-sm">Calculadora de engajamento</div>
                </div>
                <div className="text-zinc-400 text-xs leading-relaxed mb-2">
                  Descubra se um perfil tem engajamento real ou seguidores inflados antes de investir.
                </div>
                <div className="text-[11px] font-bold" style={{ color: p.accent }}>
                  Abrir grátis →
                </div>
              </a>
              <a
                href="/ferramentas/gerador-legenda-instagram"
                className="group rounded-xl p-4 block hover:scale-[1.02] transition-transform"
                style={{ background: "#111", border: `1px solid ${p.accent}55` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <div className="font-bold text-white text-sm">Gerador de legenda com IA</div>
                </div>
                <div className="text-zinc-400 text-xs leading-relaxed mb-2">
                  Crie 3 legendas persuasivas com gancho, CTA e hashtags em segundos.
                </div>
                <div className="text-[11px] font-bold" style={{ color: p.accent }}>
                  Abrir grátis →
                </div>
              </a>
            </div>
          </div>
        </section>


        <RelatedLinks accent={p.accent} />

        {/* Guias do blog — link interno real pro cluster informativo */}
        <section className="mt-10">
          <h2 className="text-lg font-black text-white mb-1">Guias para decidir antes de comprar</h2>
          <p className="text-zinc-400 text-xs mb-4">
            Conteúdo direto, sem enrolação — escrito por quem entrega os pedidos todos os dias.
          </p>
          <div className="grid gap-2">
            {[
              { href: "/blog/como-ganhar-seguidores-instagram", t: "Como ganhar seguidores no Instagram em 2026", d: "O método na ordem certa e quanto tempo leva de verdade." },
              { href: "/blog/e-seguro-comprar-seguidores", t: "É seguro comprar seguidores?", d: "O que o Instagram realmente detecta — e o que não detecta." },
              { href: "/blog/melhor-site-comprar-seguidores", t: "Melhor site para comprar seguidores", d: "5 critérios objetivos para não perder dinheiro." },
              { href: "/blog/como-tirar-instagram-privado", t: "Como tirar o Instagram do privado", d: "Passo a passo iOS e Android — obrigatório para receber entrega." },
            ].map((g) => (
              <a
                key={g.href}
                href={g.href}
                className="rounded-xl p-3 block hover:scale-[1.01] transition-transform"
                style={{ background: "#111", border: `1px solid ${p.accent}33` }}
              >
                <div className="font-bold text-white text-sm">{g.t}</div>
                <div className="text-zinc-400 text-xs mt-0.5">{g.d}</div>
              </a>
            ))}
          </div>
        </section>





        <div className="mt-12 flex justify-center pb-8">
          <a
            href={p.ctaHref}
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4 font-black text-base"
            style={{
              background: `linear-gradient(135deg, ${p.accent}, ${p.accent}dd)`,
              color: "#000",
              boxShadow: `0 0 24px ${p.accent}88`,
            }}
          >
            <Zap className="w-5 h-5" /> {p.ctaLabel}
          </a>
        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-8 py-6 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          <a href="/" className="hover:text-white transition-colors">Início</a>
          <a href="/ferramentas" className="hover:text-white transition-colors">Ferramentas grátis</a>
          <a href="/promo-5reais" className="hover:text-white transition-colors">Promo R$ 5</a>
          <a href="/kit-creator" className="hover:text-white transition-colors">Kit Creator</a>
          <a href="/rastrear" className="hover:text-white transition-colors">Rastrear pedido</a>
          <a href="/revenda" className="font-semibold text-amber-400 hover:text-amber-300 transition-colors">💼 Seja revendedor</a>
          <a href="/afiliados" className="font-semibold text-amber-400 hover:text-amber-300 transition-colors">🤝 Ganhe indicando</a>
          <a href="/blog" className="hover:text-white transition-colors">Blog</a>
          <a href="/termos" className="hover:text-white transition-colors">Termos</a>
          <a href="/reembolso" className="hover:text-white transition-colors">Reembolso</a>
          <a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a>
        </div>
        <div className="text-center text-[10px] text-zinc-600 mt-3">
          © Elite Boost Prime · BoostGG — Pagamento via Pix, entrega automática 24/7.
        </div>
      </footer>
    </MobileFrame>
  );
}
