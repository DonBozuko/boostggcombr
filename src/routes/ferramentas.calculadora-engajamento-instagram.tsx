import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Users, TrendingUp, Zap } from "lucide-react";

const CANON = "https://www.boostgg.com.br/ferramentas/calculadora-engajamento-instagram";
const TITLE = "Calculadora de Engajamento Instagram Grátis 2026 | BoostGG";
const DESC =
  "Calcule a taxa de engajamento de qualquer post do Instagram em segundos. Grátis, sem login. Descubra se o perfil tem engajamento real ou inflado.";

const FAQ = [
  {
    q: "Como calcular a taxa de engajamento no Instagram?",
    a: "Taxa de engajamento = (curtidas + comentários) ÷ seguidores × 100. Se um post tem 500 curtidas + 50 comentários em um perfil de 10.000 seguidores, a taxa é 5,5%.",
  },
  {
    q: "Qual é uma boa taxa de engajamento no Instagram em 2026?",
    a: "Perfis pequenos (até 10k): 3% a 6% é ótimo. Médios (10k-100k): 2% a 4%. Grandes (100k+): 1% a 2%. Abaixo de 1% costuma indicar seguidores inativos ou fake.",
  },
  {
    q: "Por que engajamento importa mais que número de seguidores?",
    a: "Marcas fecham parcerias olhando engajamento, não seguidores. Um perfil de 5k com 6% de engajamento vale mais que um de 50k com 0,5% — porque o público realmente vê e interage.",
  },
  {
    q: "A calculadora é grátis e sem login?",
    a: "Sim. 100% grátis, sem cadastro, sem senha do Instagram. Você digita os números do post e a taxa aparece na hora.",
  },
  {
    q: "Como aumentar minha taxa de engajamento?",
    a: "Poste com consistência, use CTAs (perguntas nos captions), responda comentários rápido, aproveite Reels e stories interativos. Se o perfil está travado, um boost de curtidas e engajamento acelera o algoritmo.",
  },
  {
    q: "Serve para Reels, fotos e carrosséis?",
    a: "Sim. Some as curtidas e comentários do post que quer analisar (não importa o formato) e divida pelos seguidores do perfil.",
  },
];

export const Route = createFileRoute("/ferramentas/calculadora-engajamento-instagram")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "calculadora engajamento instagram, taxa de engajamento instagram, calcular engajamento instagram, como calcular engajamento, engagement rate instagram",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: CANON }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Calculadora de Engajamento Instagram",
          url: CANON,
          applicationCategory: "UtilityApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          description: DESC,
        }),
      },
    ],
  }),
  component: Page,
});

function classify(rate: number, followers: number) {
  // Benchmarks 2026 ajustados por tamanho
  let excellent = 6, good = 3, ok = 1;
  if (followers >= 100_000) { excellent = 2; good = 1; ok = 0.5; }
  else if (followers >= 10_000) { excellent = 4; good = 2; ok = 1; }

  if (rate >= excellent) return { label: "Excelente", color: "#10b981", msg: "Engajamento top. Marcas pagam bem por perfis assim." };
  if (rate >= good) return { label: "Bom", color: "#3b82f6", msg: "Engajamento saudável. Continue firme na consistência." };
  if (rate >= ok) return { label: "Médio", color: "#f59e0b", msg: "Dá pra melhorar. Foque em Reels + CTAs no caption." };
  return { label: "Baixo", color: "#ef4444", msg: "Seguidores inativos ou algoritmo travado. Um boost de curtidas + engajamento acelera a distribuição." };
}

function Page() {
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [followers, setFollowers] = useState("");

  const result = useMemo(() => {
    const l = parseInt(likes) || 0;
    const c = parseInt(comments) || 0;
    const f = parseInt(followers) || 0;
    if (f <= 0) return null;
    const rate = ((l + c) / f) * 100;
    return { rate, ...classify(rate, f) };
  }, [likes, comments, followers]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "40px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <nav style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
          <Link to="/" style={{ color: "#888" }}>Home</Link> ›{" "}
          <Link to="/ferramentas/contador-seguidores" style={{ color: "#888" }}>Ferramentas</Link> › Calculadora de Engajamento
        </nav>

        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, lineHeight: 1.15 }}>
          Calculadora de Engajamento Instagram
        </h1>
        <p style={{ color: "#aaa", marginBottom: 28, fontSize: 15 }}>
          Descubra em segundos se um perfil tem engajamento real. Grátis, sem login.
        </p>

        <Card style={{ padding: 24, background: "#111", border: "1px solid #222", marginBottom: 24 }}>
          <div style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 13, color: "#ccc", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Heart size={14} /> Curtidas no post
              </span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Ex: 500"
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 13, color: "#ccc", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <MessageCircle size={14} /> Comentários no post
              </span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Ex: 50"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 13, color: "#ccc", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Users size={14} /> Seguidores do perfil
              </span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Ex: 10000"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
              />
            </label>
          </div>

          {result && (
            <div style={{ marginTop: 24, padding: 20, background: "#0a0a0a", borderRadius: 8, border: `2px solid ${result.color}` }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#888" }}>Taxa de engajamento</div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: result.color, lineHeight: 1 }}>
                    {result.rate.toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    background: result.color,
                    color: "#000",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {result.label}
                </div>
              </div>
              <p style={{ marginTop: 12, color: "#ccc", fontSize: 14 }}>{result.msg}</p>
              {result.rate < 3 && (
                <Link to="/comprar-curtidas-instagram" style={{ display: "inline-block", marginTop: 14 }}>
                  <Button style={{ background: "#e1306c", color: "#fff", fontWeight: 700 }}>
                    <Zap size={16} style={{ marginRight: 6 }} /> Turbinar engajamento agora
                  </Button>
                </Link>
              )}
            </div>
          )}

          {!result && (
            <p style={{ marginTop: 20, fontSize: 13, color: "#666", textAlign: "center" }}>
              Preencha os 3 campos para ver sua taxa
            </p>
          )}
        </Card>

        <Card style={{ padding: 20, background: "#111", border: "1px solid #222", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} /> Benchmarks 2026
          </h2>
          <div style={{ display: "grid", gap: 8, fontSize: 14, color: "#ccc" }}>
            <div>• <strong>Até 10k seguidores:</strong> 3-6% é ótimo</div>
            <div>• <strong>10k a 100k:</strong> 2-4% é bom</div>
            <div>• <strong>100k+:</strong> 1-2% já é excelente</div>
            <div>• <strong>Abaixo de 1%:</strong> seguidores inativos ou algoritmo travado</div>
          </div>
        </Card>

        <Card style={{ padding: 20, background: "#111", border: "1px solid #222", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Como calcular manualmente</h2>
          <div style={{ background: "#0a0a0a", padding: 14, borderRadius: 6, fontSize: 14, color: "#ccc", fontFamily: "monospace" }}>
            (curtidas + comentários) ÷ seguidores × 100 = taxa %
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "#888" }}>
            Ex: 500 curtidas + 50 comentários em perfil de 10.000 seguidores → (500+50)/10000×100 = <strong style={{ color: "#fff" }}>5,5%</strong>
          </p>
        </Card>

        <Card style={{ padding: 20, background: "#111", border: "1px solid #222", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Precisa de mais dados?</h2>
          <p style={{ fontSize: 14, color: "#aaa", marginBottom: 12 }}>
            Use nosso <Link to="/ferramentas/contador-seguidores" style={{ color: "#3b82f6" }}>contador de seguidores</Link> pra pegar o número exato de seguidores de qualquer perfil público.
          </p>
        </Card>

        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Perguntas frequentes</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {FAQ.map((f) => (
              <details key={f.q} style={{ background: "#111", border: "1px solid #222", borderRadius: 8, padding: "14px 16px" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }}>{f.q}</summary>
                <p style={{ marginTop: 10, color: "#bbb", fontSize: 14, lineHeight: 1.55 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
