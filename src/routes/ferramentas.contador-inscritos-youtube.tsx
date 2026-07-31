// v379 — Ímã de tráfego: "contador de inscritos" (2.400/mo, concorrência baixa)
// + "contador de inscritos youtube em tempo real". Dados reais do canal público.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { contarInscritos } from "@/lib/contador-inscritos.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Users, Youtube } from "lucide-react";

const CANON = "https://www.boostgg.com.br/ferramentas/contador-inscritos-youtube";

const FAQ = [
  {
    q: "O contador de inscritos do YouTube é grátis?",
    a: "Sim. É 100% gratuito, sem login, sem cadastro e sem limite de consultas. Digite o @canal e veja o número de inscritos na hora.",
  },
  {
    q: "Como saber quantos inscritos um canal do YouTube tem?",
    a: "Digite o @nome do canal (ou cole o link do canal) no campo acima e clique em 'Contar inscritos'. Buscamos o dado direto da página pública do canal.",
  },
  {
    q: "O número de inscritos é em tempo real?",
    a: "Sim, cada consulta lê o canal naquele momento. O YouTube arredonda a contagem pública a partir de 1.000 inscritos (ex.: 1,38 mi), então mostramos exatamente o mesmo valor que qualquer visitante vê.",
  },
  {
    q: "Funciona com qualquer canal?",
    a: "Funciona com todo canal público que tenha @handle. Canais que escondem a contagem de inscritos nas configurações não exibem o número — nesse caso avisamos em vez de inventar um valor.",
  },
  {
    q: "Preciso da minha senha do YouTube ou do Google?",
    a: "Não. Nunca pedimos login. Usamos apenas informação pública do canal, então sua conta continua segura.",
  },
  {
    q: "Dá para usar o contador para acompanhar concorrentes?",
    a: "Sim. É o uso mais comum: comparar canais do mesmo nicho e medir crescimento semana a semana antes de decidir onde investir.",
  },
];

export const Route = createFileRoute("/ferramentas/contador-inscritos-youtube")({
  head: () => ({
    meta: [
      { title: "Contador de Inscritos do YouTube Grátis em Tempo Real 2026" },
      {
        name: "description",
        content:
          "Contador de inscritos do YouTube grátis e em tempo real. Digite o @canal e veja quantos inscritos qualquer canal tem. Sem login e sem cadastro.",
      },
      {
        name: "keywords",
        content: "contador de inscritos, contador de inscritos youtube, quantos inscritos tem o canal, contador inscritos tempo real",
      },
      { property: "og:title", content: "Contador de Inscritos do YouTube Grátis em Tempo Real" },
      { property: "og:description", content: "Veja em segundos quantos inscritos qualquer canal do YouTube tem. Grátis, sem login." },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
          name: "Contador de Inscritos do YouTube",
          url: CANON,
          applicationCategory: "UtilityApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          description: "Ferramenta gratuita para ver quantos inscritos um canal público do YouTube tem, em tempo real.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.boostgg.com.br/" },
            { "@type": "ListItem", position: 2, name: "Ferramentas", item: "https://www.boostgg.com.br/ferramentas" },
            { "@type": "ListItem", position: 3, name: "Contador de Inscritos do YouTube", item: CANON },
          ],
        }),
      },
    ],
  }),
  component: ContadorInscritosPage,
});

function ContadorInscritosPage() {
  const [canal, setCanal] = useState("");
  const fn = useServerFn(contarInscritos);
  const mut = useMutation({ mutationFn: (c: string) => fn({ data: { canal: c } }) });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canal.trim()) mut.mutate(canal);
  };

  const res = mut.data;
  const data = res && res.ok ? res : null;
  const erro = res && !res.ok ? res.error : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            Contador de <span className="text-primary">Inscritos do YouTube</span> grátis
          </h1>
          <p className="mt-3 text-muted-foreground">
            Digite o <strong>@canal</strong> e veja em tempo real quantos <strong>inscritos</strong> qualquer canal público do
            YouTube tem — <strong>grátis, sem login, ilimitado</strong>.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                value={canal}
                onChange={(e) => setCanal(e.target.value.replace(/^@/, ""))}
                placeholder="nome_do_canal"
                className="pl-7"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={80}
              />
            </div>
            <Button type="submit" disabled={mut.isPending || !canal.trim()} className="sm:w-48">
              {mut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Consultando…
                </>
              ) : (
                "Contar inscritos"
              )}
            </Button>
          </form>

          {erro && (
            <p className="mt-4 text-sm text-destructive">
              {erro === "NOT_FOUND"
                ? "Canal não encontrado. Confira o @handle do canal."
                : "Falha ao consultar. Tente novamente em alguns segundos."}
            </p>
          )}

          {data && (
            <div className="mt-6 rounded-lg border bg-card p-5">
              <div className="flex items-center gap-4">
                {data.avatar ? (
                  <img
                    src={data.avatar}
                    alt={`Foto do canal ${data.nome} no YouTube`}
                    className="h-16 w-16 rounded-full border object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{data.nome}</p>
                    <Youtube className="h-4 w-4 text-primary" />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">@{data.handle}</p>
                </div>
              </div>

              <div className="mt-5">
                {data.inscritosTexto ? (
                  <div className="rounded-md border bg-muted/40 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Users className="h-4 w-4" /> Inscritos
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-primary">{data.inscritosTexto}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Valor público exibido pelo YouTube (arredondado a partir de mil inscritos).
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                    Este canal está com a contagem de inscritos oculta nas configurações do YouTube. Não temos como mostrar o
                    número — e não vamos inventar um.
                  </p>
                )}
              </div>

              {data.descricao && <p className="mt-4 text-sm text-muted-foreground">{data.descricao}</p>}

              <div className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Quer <strong className="text-foreground">crescer</strong> esse canal?
                </p>
                <Link
                  to="/comprar-inscritos-youtube"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Ganhar inscritos via Pix →
                </Link>
              </div>
            </div>
          )}
        </Card>

        <section className="mt-12 space-y-4 text-sm text-muted-foreground">
          <h2 className="text-2xl font-bold text-foreground">Como funciona o contador de inscritos</h2>
          <p>
            O <strong>contador de inscritos do YouTube</strong> da BoostGG lê a página pública do canal informado e devolve o
            número de inscritos em segundos. Não precisa instalar extensão, autorizar sua conta Google nem informar senha. É
            exatamente o mesmo dado que aparece para qualquer visitante do canal.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Por que o número aparece arredondado?</h2>
          <p>
            Desde 2019 o YouTube mostra a contagem pública abreviada acima de mil inscritos: 1.384.502 vira “1,38 mi”. Só o dono
            do canal vê o número exato dentro do YouTube Studio. Qualquer site que prometa a contagem exata de outro canal em
            tempo real está estimando — nós preferimos mostrar o valor real e dizer a verdade sobre ele.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Como usar isso para crescer de verdade</h2>
          <p>
            Escolha três canais do seu nicho, anote a contagem hoje e repita em sete dias. A diferença semanal mostra quem está
            realmente acelerando. Se o seu canal cresce mais devagar que a média do nicho, o gargalo costuma ser CTR da capa ou
            retenção dos primeiros 30 segundos — não a quantidade de vídeos publicados.
          </p>

          <EmbedSnippet
            tipo="yt"
            toolPath="/ferramentas/contador-inscritos-youtube"
            toolTitle="Contador de inscritos do YouTube"
            placeholder="@nomedocanal"
          />

          <h2 className="text-2xl font-bold text-foreground">Perguntas frequentes</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-foreground">{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-6">
            <Link to="/ferramentas/contador-seguidores" className="text-primary hover:underline">
              Contador de seguidores do Instagram
            </Link>
            <Link to="/ferramentas" className="text-primary hover:underline">
              Todas as ferramentas grátis
            </Link>
            <Link to="/comprar-inscritos-youtube" className="text-primary hover:underline">
              Comprar inscritos no YouTube
            </Link>
            <Link to="/crescer-youtube" className="text-primary hover:underline">
              Como crescer no YouTube
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
