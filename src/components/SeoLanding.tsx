// v200 — Componente reutilizável para landing pages SEO (keyword-alvo → CTA no checkout real).

import { BrandHeader } from "@/components/BrandHeader";
import { MobileFrame } from "@/components/MobileFrame";
import { CheckCircle2, Zap, Shield, Clock } from "lucide-react";

export type SeoBenefit = { icon: "check" | "zap" | "shield" | "clock"; title: string; text: string };
export type SeoFaq = { q: string; a: string };
export type SeoPricingRow = { qty: string; price: string; note?: string };

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
  bodySections: { h2: string; body: string }[];
  faq: SeoFaq[];
}

const iconMap = { check: CheckCircle2, zap: Zap, shield: Shield, clock: Clock };

export function SeoLanding(p: SeoLandingProps) {
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
                {p.pricing.map((r, i) => (
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

        {/* Ferramentas grátis — link juice interno pras ferramentas SEO */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-white mb-3">Ferramentas grátis pra analisar antes de comprar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/ferramentas/contador-seguidores"
              className="rounded-xl p-4 block hover:opacity-90 transition-opacity"
              style={{ background: "#111", border: `1px solid ${p.accent}55` }}
            >
              <div className="font-bold text-white text-sm mb-1">Contador de seguidores Instagram</div>
              <div className="text-zinc-400 text-xs leading-relaxed">
                Digite o @ e veja em tempo real quantos seguidores qualquer perfil público tem — grátis, sem login.
              </div>
            </a>
            <a
              href="/ferramentas/calculadora-engajamento-instagram"
              className="rounded-xl p-4 block hover:opacity-90 transition-opacity"
              style={{ background: "#111", border: `1px solid ${p.accent}55` }}
            >
              <div className="font-bold text-white text-sm mb-1">Calculadora de engajamento Instagram</div>
              <div className="text-zinc-400 text-xs leading-relaxed">
                Descubra se um perfil tem engajamento real ou seguidores inflados antes de investir.
              </div>
            </a>
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
    </MobileFrame>
  );
}
