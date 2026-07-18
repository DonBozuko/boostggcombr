import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { gerarLegenda } from "@/lib/gerador-legenda.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, Check, Sparkles } from "lucide-react";

const CANON = "https://boostgg.com.br/ferramentas/gerador-legenda-instagram";
const TITLE = "Gerador de Legenda Instagram Grátis com IA 2026";
const DESC =
  "Gerador de legenda para Instagram grátis com IA. Crie 3 legendas persuasivas em segundos com hashtags e CTA. Sem login, sem cadastro.";

const TONES = [
  { v: "persuasivo", l: "Persuasivo" },
  { v: "engracado", l: "Engraçado" },
  { v: "inspirador", l: "Inspirador" },
  { v: "profissional", l: "Profissional" },
  { v: "polemico", l: "Polêmico" },
  { v: "romantico", l: "Romântico" },
] as const;

const OBJETIVOS = [
  { v: "engajamento", l: "Engajamento" },
  { v: "vendas", l: "Vendas" },
  { v: "seguidores", l: "Seguidores" },
  { v: "autoridade", l: "Autoridade" },
  { v: "trafego", l: "Tráfego / link" },
] as const;

const FAQ = [
  {
    q: "O gerador de legenda para Instagram é grátis?",
    a: "Sim. 100% grátis, sem login e sem cadastro. Use quantas vezes quiser para criar legendas de Instagram com IA.",
  },
  {
    q: "Como funciona o gerador de legenda com IA?",
    a: "Você descreve o tema do post, escolhe o tom (persuasivo, engraçado, inspirador…) e o objetivo. A IA gera 3 opções de legenda em português BR, com gancho, corpo, CTA e hashtags relevantes.",
  },
  {
    q: "As legendas são únicas ou copiadas?",
    a: "Únicas. Cada geração produz textos novos. Não usamos banco de legendas prontas — tudo é criado na hora por IA.",
  },
  {
    q: "Serve para Reels, Feed, Carrossel e Stories?",
    a: "Sim. Descreva o formato no tema (ex: 'Reels sobre bastidor de treino') e o gerador adapta o texto ao contexto.",
  },
  {
    q: "As hashtags são relevantes para o Brasil?",
    a: "Sim, todas em português BR e relacionadas ao tema. Você pode desativar as hashtags se quiser gerar só a legenda.",
  },
];

type Legenda = { titulo: string; texto: string; cta: string; hashtags: string };

export const Route = createFileRoute("/ferramentas/gerador-legenda-instagram")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "gerador de legenda instagram, gerador de legenda com ia, criar legenda instagram, legenda para instagram, legenda pronta instagram, gerador legenda reels",
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
          "@type": "WebApplication",
          name: "Gerador de Legenda Instagram com IA",
          url: CANON,
          applicationCategory: "UtilityApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          description: DESC,
        }),
      },
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
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://boostgg.com.br/" },
            { "@type": "ListItem", position: 2, name: "Ferramentas", item: "https://boostgg.com.br/ferramentas" },
            { "@type": "ListItem", position: 3, name: "Gerador de Legenda Instagram", item: CANON },
          ],
        }),
      },
    ],
  }),
  component: GeradorLegendaPage,
});

function GeradorLegendaPage() {
  const [tema, setTema] = useState("");
  const [tom, setTom] = useState<(typeof TONES)[number]["v"]>("persuasivo");
  const [objetivo, setObjetivo] = useState<(typeof OBJETIVOS)[number]["v"]>("engajamento");
  const [emojis, setEmojis] = useState(true);
  const [hashtags, setHashtags] = useState(true);
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null);

  const fn = useServerFn(gerarLegenda);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: { tema, tom, objetivo, incluirEmojis: emojis, incluirHashtags: hashtags },
      }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tema.trim().length >= 3) mut.mutate();
  };

  const copiar = async (idx: number, l: Legenda) => {
    const texto = [l.titulo, "", l.texto, "", l.cta, "", l.hashtags].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoIdx(idx);
      setTimeout(() => setCopiadoIdx(null), 1600);
    } catch {}
  };

  const res = mut.data;
  const legendas = res && res.ok ? res.legendas : [];
  const erro = res && !res.ok ? res.message : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> IA grátis · sem login
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            Gerador de <span className="text-primary">Legenda Instagram</span> com IA
          </h1>
          <p className="mt-3 text-muted-foreground">
            Descreva seu post e gere <strong>3 legendas persuasivas</strong> em segundos, com gancho, CTA e
            hashtags — em português BR, <strong>grátis e sem cadastro</strong>.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="tema" className="mb-1 block text-sm font-medium">
                Sobre o que é o post?
              </label>
              <Textarea
                id="tema"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: Reels mostrando bastidor de treino, dica de disciplina para academia."
                maxLength={400}
                rows={3}
              />
              <p className="mt-1 text-xs text-muted-foreground">{tema.length}/400</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Tom</label>
                <select
                  value={tom}
                  onChange={(e) => setTom(e.target.value as (typeof TONES)[number]["v"])}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TONES.map((t) => (
                    <option key={t.v} value={t.v}>
                      {t.l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Objetivo</label>
                <select
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value as (typeof OBJETIVOS)[number]["v"])}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {OBJETIVOS.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={emojis} onChange={(e) => setEmojis(e.target.checked)} />
                Incluir emojis
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={hashtags} onChange={(e) => setHashtags(e.target.checked)} />
                Incluir hashtags
              </label>
            </div>

            <Button type="submit" disabled={mut.isPending || tema.trim().length < 3} className="w-full">
              {mut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando legendas…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Gerar 3 legendas
                </>
              )}
            </Button>
          </form>

          {erro && <p className="mt-4 text-sm text-destructive">{erro}</p>}

          {legendas.length > 0 && (
            <div className="mt-6 space-y-4">
              {legendas.map((l, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Opção {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => copiar(idx, l)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      {copiadoIdx === idx ? (
                        <>
                          <Check className="h-3 w-3" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-semibold">{l.titulo}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{l.texto}</p>
                  {l.cta && <p className="mt-2 text-sm font-medium text-primary">{l.cta}</p>}
                  {l.hashtags && (
                    <p className="mt-3 break-words text-xs text-muted-foreground">{l.hashtags}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <section className="mt-12 space-y-4 text-sm text-muted-foreground">
          <h2 className="text-2xl font-bold text-foreground">Como usar o gerador de legenda</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Descreva em 1 frase sobre o que é o post.</li>
            <li>Escolha o <strong>tom</strong> (persuasivo, engraçado, inspirador…) e o <strong>objetivo</strong>.</li>
            <li>Clique em <strong>Gerar 3 legendas</strong>. Copie a que preferir e cole no Instagram.</li>
          </ol>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Por que usar legendas com IA</h2>
          <p>
            A <strong>legenda do Instagram</strong> é o que faz o algoritmo entender o post, gera comentário e
            leva para o link na bio. Uma legenda fraca desperdiça um bom vídeo. Uma legenda com gancho +
            retenção + CTA multiplica alcance e conversão — e é exatamente o que esse gerador entrega.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Depois de postar, o que fazer?</h2>
          <p>
            Legenda boa acelera engajamento, mas quem já começa com <strong>prova social</strong> ganha o
            algoritmo mais rápido. Se você quer que o algoritmo empurre seu conteúdo desde o primeiro minuto,{" "}
            <Link to="/comprar-seguidores-instagram" className="text-primary underline">
              comprar seguidores brasileiros no Pix
            </Link>{" "}
            é o atalho que os grandes perfis usam em silêncio.
          </p>

          <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
            <strong className="text-foreground">Ferramentas relacionadas:</strong>
            <ul className="mt-2 space-y-1">
              <li>
                →{" "}
                <Link to="/ferramentas/contador-seguidores" className="text-primary underline">
                  Contador de Seguidores Instagram
                </Link>
              </li>
              <li>
                →{" "}
                <Link
                  to="/ferramentas/calculadora-engajamento-instagram"
                  className="text-primary underline"
                >
                  Calculadora de Engajamento Instagram
                </Link>
              </li>
            </ul>
          </div>

          <h2 className="pt-6 text-2xl font-bold text-foreground">Perguntas frequentes</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-foreground">{f.q}</h3>
                <p className="mt-1 text-sm">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-lg border border-primary/40 bg-primary/5 p-5 text-center">
            <p className="text-base font-semibold text-foreground">
              Já tem a legenda — falta o <span className="text-primary">alcance</span>?
            </p>
            <p className="mt-1 text-sm">Seguidores brasileiros reais, entrega no Pix em minutos.</p>
            <Link
              to="/comprar-seguidores-instagram"
              className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Comprar seguidores Instagram →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
