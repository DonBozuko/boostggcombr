import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { contarSeguidores } from "@/lib/contador-seguidores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Users, UserPlus, Image as ImageIcon, BadgeCheck, Lock } from "lucide-react";

const CANON = "https://boostgg.com.br/ferramentas/contador-seguidores";

const FAQ = [
  {
    q: "O contador de seguidores do Instagram é gratuito?",
    a: "Sim. Nosso contador de seguidores Instagram é 100% grátis, sem login, sem cadastro e sem limite de consultas. Basta digitar o @usuario e ver os números em tempo real.",
  },
  {
    q: "Como saber quantos seguidores um perfil do Instagram tem?",
    a: "Digite o nome de usuário (@usuario) no campo acima e clique em 'Contar seguidores'. Em segundos mostramos seguidores, seguindo, número de posts e status de verificação do perfil público.",
  },
  {
    q: "Funciona para qualquer perfil do Instagram?",
    a: "Funciona para todos os perfis públicos. Contas privadas exibem apenas nome de usuário, foto e status; os números de seguidores/seguindo/posts só aparecem em perfis abertos.",
  },
  {
    q: "Preciso fazer login no Instagram para usar?",
    a: "Não. Nunca pedimos sua senha do Instagram. Usamos apenas dados públicos, então sua conta continua 100% segura.",
  },
  {
    q: "Os dados do contador são atualizados em tempo real?",
    a: "Sim. Cada consulta busca a informação diretamente do perfil público naquele momento, então o número de seguidores é o mesmo que aparece no app do Instagram.",
  },
  {
    q: "Posso usar para analisar concorrentes e influenciadores?",
    a: "Sim, essa é uma das principais funções. Compare a razão seguidores/seguindo para identificar perfis com engajamento real e evitar influenciadores com números inflados.",
  },
];

export const Route = createFileRoute("/ferramentas/contador-seguidores")({
  head: () => ({
    meta: [
      { title: "Contador de Seguidores Instagram Grátis em Tempo Real 2026" },
      {
        name: "description",
        content:
          "Contador de seguidores do Instagram grátis e em tempo real. Digite o @usuario e veja seguidores, seguindo, posts e verificação. Sem login, sem cadastro.",
      },
      { name: "keywords", content: "contador de seguidores instagram, contador seguidores, ver seguidores instagram, quantos seguidores tem, contador insta grátis" },
      { property: "og:title", content: "Contador de Seguidores Instagram Grátis em Tempo Real" },
      { property: "og:description", content: "Descubra em segundos quantos seguidores qualquer perfil do Instagram tem. Grátis, sem login." },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "website" },
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
          name: "Contador de Seguidores Instagram",
          url: CANON,
          applicationCategory: "UtilityApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          description:
            "Ferramenta gratuita para contar seguidores, seguindo e posts de qualquer perfil público do Instagram em tempo real.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Como usar o contador de seguidores do Instagram",
          description: "Descubra em segundos quantos seguidores qualquer perfil público do Instagram tem.",
          totalTime: "PT5S",
          step: [
            { "@type": "HowToStep", position: 1, name: "Digite o @usuario", text: "Digite o nome de usuário do Instagram que você quer analisar, sem espaços." },
            { "@type": "HowToStep", position: 2, name: "Clique em Contar seguidores", text: "Clique no botão Contar seguidores e aguarde 2 a 3 segundos." },
            { "@type": "HowToStep", position: 3, name: "Veja o resultado", text: "Visualize seguidores, seguindo, posts, foto de perfil e status de verificação em tempo real." },
          ],
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
            { "@type": "ListItem", position: 3, name: "Contador de Seguidores Instagram", item: CANON },
          ],
        }),
      },
    ],
  }),
  component: ContadorPage,
});

function formatNum(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function ContadorPage() {
  const [username, setUsername] = useState("");
  const fn = useServerFn(contarSeguidores);
  const mut = useMutation({ mutationFn: (u: string) => fn({ data: { username: u } }) });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) mut.mutate(username);
  };

  const res = mut.data;
  const data = res && res.ok ? res : null;
  const erro = res && !res.ok ? res.error : null;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            Contador de <span className="text-primary">Seguidores Instagram</span> grátis
          </h1>
          <p className="mt-3 text-muted-foreground">
            Digite o <strong>@usuario</strong> e veja em tempo real quantos <strong>seguidores</strong>, seguindo e posts
            qualquer perfil público do Instagram tem — <strong>grátis, sem login, ilimitado</strong>.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                placeholder="usuario_do_instagram"
                className="pl-7"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
              />
            </div>
            <Button type="submit" disabled={mut.isPending || !username.trim()} className="sm:w-48">
              {mut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Consultando…
                </>
              ) : (
                "Contar seguidores"
              )}
            </Button>
          </form>

          {erro && (
            <p className="mt-4 text-sm text-destructive">
              {erro === "NOT_FOUND"
                ? "Perfil não encontrado. Verifique o @usuario."
                : "Falha ao consultar. Tente novamente em alguns segundos."}
            </p>
          )}

          {data && (
            <div className="mt-6 rounded-lg border bg-card p-5">
              <div className="flex items-center gap-4">
                {data.avatar ? (
                  <img
                    src={data.avatar}
                    alt={`Foto do perfil @${data.username} no Instagram`}
                    className="h-16 w-16 rounded-full border object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">@{data.username}</p>
                    {data.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    {data.privado && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  {data.fullName && <p className="truncate text-sm text-muted-foreground">{data.fullName}</p>}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat icon={<Users className="h-4 w-4" />} label="Seguidores" value={formatNum(data.seguidores)} highlight />
                <Stat icon={<UserPlus className="h-4 w-4" />} label="Seguindo" value={formatNum(data.seguindo)} />
                <Stat icon={<ImageIcon className="h-4 w-4" />} label="Posts" value={formatNum(data.posts)} />
              </div>

              <div className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Quer <strong className="text-foreground">turbinar</strong> esse perfil?
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Impulsionar perfil no Pix →
                </Link>
              </div>
            </div>
          )}
        </Card>

        <section className="mt-12 space-y-4 text-sm text-muted-foreground">
          <h2 className="text-2xl font-bold text-foreground">Como funciona o contador de seguidores</h2>
          <p>
            O <strong>contador de seguidores do Instagram</strong> da BoostGG consulta os dados públicos do perfil informado e
            devolve os números atualizados em segundos. Não é preciso instalar app, dar permissão à sua conta ou informar
            senha. É a mesma informação que aparece no aplicativo oficial, só que sem precisar abrir o Instagram.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Digite o <strong>@usuario</strong> do Instagram que você quer analisar (sem espaços).</li>
            <li>Clique em <strong>“Contar seguidores”</strong> e aguarde 2–3 segundos.</li>
            <li>Veja seguidores, seguindo, posts, foto de perfil e status de verificação.</li>
          </ol>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Contador de seguidores antes de comprar</h2>
          <p>
            Usar o contador de seguidores Instagram antes de <Link to="/comprar-seguidores-instagram" className="text-primary underline">comprar seguidores Instagram</Link> é o jeito mais inteligente de medir o resultado. Anote o número atual, faça o pedido na BoostGG e consulte novamente em 24 horas para ver o crescimento real. A ferramenta é grátis, então você pode usar quantas vezes quiser para acompanhar perfis próprios, de concorrentes ou de influenciadores.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Para que serve um contador de seguidores</h2>
          <p>
            Muito mais do que curiosidade. Um bom contador de seguidores é ferramenta essencial para quem trabalha com marketing,
            faz parcerias com influenciadores ou está construindo autoridade no Instagram:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Analisar concorrentes</strong> antes de investir em conteúdo ou tráfego pago.</li>
            <li><strong>Verificar influenciadores</strong>: perfil que segue muita gente e tem poucos seguidores costuma ter engajamento fraco.</li>
            <li><strong>Acompanhar o crescimento</strong> de perfis parceiros, clientes ou seu próprio.</li>
            <li><strong>Validar entregas</strong> de campanhas de seguidores comprados ou orgânicos.</li>
            <li><strong>Benchmark</strong> rápido de nichos e categorias.</li>
          </ul>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Contas privadas x contas públicas</h2>
          <p>
            Perfis <strong>públicos</strong> mostram todos os números: seguidores, seguindo, posts e verificação. Perfis
            <strong> privados</strong> exibem apenas nome de usuário, nome real e foto — os números ficam ocultos por decisão do
            próprio Instagram, e nenhuma ferramenta legítima consegue burlar isso.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-foreground">É seguro usar?</h2>
          <p>
            Sim. Nunca pedimos sua senha do Instagram, não instalamos nada no seu dispositivo e não guardamos histórico das
            consultas. Usamos apenas dados <strong>públicos</strong> do perfil pesquisado. Sua conta continua 100% segura.
          </p>

          <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
            <strong className="text-foreground">Ferramenta relacionada:</strong>{" "}
            <Link to="/ferramentas/calculadora-engajamento-instagram" className="text-primary underline">
              Calculadora de Engajamento Instagram
            </Link>{" "}
            — descubra se o perfil tem engajamento real ou seguidores inflados.
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
              Já sabe quantos seguidores tem — que tal <span className="text-primary">crescer o seu</span>?
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

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? "bg-primary/10 border-primary/40" : ""}`}>
      <div className="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
