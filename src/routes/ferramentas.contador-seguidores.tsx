import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, Image as ImageIcon, TrendingUp } from "lucide-react";

const CANON = "https://www.boostgg.com.br/ferramentas/contador-seguidores";

const FAQ = [
  {
    q: "O contador de seguidores do Instagram é gratuito?",
    a: "Sim. A ferramenta é 100% grátis, sem login, sem cadastro e sem limite de uso. Você informa os números que aparecem no perfil e recebe a análise na hora.",
  },
  {
    q: "Como saber quantos seguidores um perfil do Instagram tem?",
    a: "Abra o perfil no app ou no navegador: os três números no topo são posts, seguidores e seguindo. Copie esses valores aqui em cima para descobrir se o perfil tem base real ou inflada.",
  },
  {
    q: "Por que preciso digitar os números em vez de só o @usuario?",
    a: "Porque o Instagram bloqueia consultas automáticas feitas por servidores. Qualquer site que promete puxar o número sozinho ou está usando dados velhos em cache, ou vai falhar na hora que você precisar. Preferimos entregar um resultado que sempre funciona.",
  },
  {
    q: "O que é a razão seguidores/seguindo?",
    a: "É seguidores dividido por seguindo. Acima de 10 indica autoridade real; entre 1 e 10 é um perfil comum em crescimento; abaixo de 1 costuma indicar perfil que segue muita gente só para ganhar seguidor de volta.",
  },
  {
    q: "Como saber se um influenciador tem seguidores comprados?",
    a: "Olhe a razão e a média de seguidores por post. Perfil com centenas de milhares de seguidores, poucos posts e engajamento baixo é o padrão clássico de base inflada.",
  },
  {
    q: "Funciona para perfis privados?",
    a: "Sim. Mesmo em conta privada o Instagram mostra publicamente posts, seguidores e seguindo — é só copiar esses três números.",
  },
];

export const Route = createFileRoute("/ferramentas/contador-seguidores")({
  head: () => ({
    meta: [
      { title: "Contador de Seguidores Instagram Grátis — Análise de Perfil 2026" },
      {
        name: "description",
        content:
          "Contador e analisador de seguidores do Instagram grátis. Descubra se o perfil tem base real ou inflada, razão seguidores/seguindo e projeção de crescimento. Sem login.",
      },
      {
        name: "keywords",
        content:
          "contador de seguidores instagram, contador seguidores, analisar perfil instagram, seguidores falsos, quantos seguidores tem",
      },
      { property: "og:title", content: "Contador de Seguidores Instagram Grátis — Análise de Perfil" },
      {
        property: "og:description",
        content: "Analise qualquer perfil do Instagram: base real ou inflada, razão seguidores/seguindo e projeção de crescimento. Grátis.",
      },
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
          name: "Contador e Analisador de Seguidores Instagram",
          url: CANON,
          applicationCategory: "UtilityApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          description:
            "Ferramenta gratuita para analisar seguidores, seguindo e posts de qualquer perfil do Instagram e descobrir se a base é real ou inflada.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Como analisar os seguidores de um perfil do Instagram",
          description: "Descubra em segundos se um perfil do Instagram tem base real ou seguidores inflados.",
          totalTime: "PT30S",
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Abra o perfil no Instagram",
              text: "Abra o perfil que você quer analisar e veja os três números do topo: posts, seguidores e seguindo.",
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Copie os números",
              text: "Digite seguidores, seguindo e posts nos campos da ferramenta.",
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Veja o diagnóstico",
              text: "Receba a classificação do perfil, a razão seguidores/seguindo e quanto falta para as próximas metas.",
            },
          ],
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
            { "@type": "ListItem", position: 3, name: "Contador de Seguidores Instagram", item: CANON },
          ],
        }),
      },
    ],
  }),
  component: ContadorPage,
});

function formatNum(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

function parseNum(v: string) {
  const limpo = v.replace(/[^\d]/g, "");
  return limpo ? Number(limpo) : 0;
}

type Diagnostico = {
  razao: number;
  titulo: string;
  cor: string;
  texto: string;
  porPost: number;
  metas: { alvo: number; falta: number }[];
};

function analisar(seguidores: number, seguindo: number, posts: number): Diagnostico {
  const razao = seguindo > 0 ? seguidores / seguindo : seguidores;
  const porPost = posts > 0 ? seguidores / posts : 0;

  let titulo = "Perfil em crescimento";
  let cor = "text-primary";
  let texto =
    "Base equilibrada: você tem mais seguidores do que gente que segue. É o estágio em que investir em novos seguidores rende mais, porque o perfil já passa credibilidade.";

  if (razao >= 10) {
    titulo = "Perfil de autoridade";
    cor = "text-emerald-500";
    texto =
      "Razão alta: muita gente segue e o perfil segue pouca. É o padrão de contas de referência no nicho. O foco agora é engajamento e conversão, não só volume.";
  } else if (razao < 1) {
    titulo = "Base frágil (segue mais do que é seguido)";
    cor = "text-amber-500";
    texto =
      "O perfil segue mais contas do que tem seguidores. Isso passa a impressão de conta nova ou de quem busca follow-back, e reduz a chance de alguém seguir de volta espontaneamente.";
  }

  if (posts > 0 && porPost > 5000 && razao > 20) {
    titulo = "Atenção: possível base inflada";
    cor = "text-destructive";
    texto =
      "Muitos seguidores para poucos posts é o padrão clássico de conta com base comprada de baixa qualidade ou herdada de outro nicho. Se for um influenciador que você vai contratar, peça o print de alcance antes de fechar.";
  }

  const escalas = [1000, 10000, 50000, 100000, 500000, 1000000];
  const metas = escalas
    .filter((a) => a > seguidores)
    .slice(0, 3)
    .map((alvo) => ({ alvo, falta: alvo - seguidores }));

  return { razao, titulo, cor, texto, porPost, metas };
}

function ContadorPage() {
  const [seguidores, setSeguidores] = useState("");
  const [seguindo, setSeguindo] = useState("");
  const [posts, setPosts] = useState("");
  const [enviado, setEnviado] = useState(false);

  const s = parseNum(seguidores);
  const sg = parseNum(seguindo);
  const p = parseNum(posts);

  const resultado = useMemo(() => (enviado && s > 0 ? analisar(s, sg, p) : null), [enviado, s, sg, p]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            Contador de <span className="text-primary">Seguidores Instagram</span> grátis
          </h1>
          <p className="mt-3 text-muted-foreground">
            Informe os números que aparecem no perfil e descubra na hora se a base é <strong>real ou inflada</strong>, a razão{" "}
            <strong>seguidores/seguindo</strong> e quanto falta para a próxima meta — grátis, sem login.
          </p>
        </div>

        <Card className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEnviado(true);
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo label="Seguidores" value={seguidores} onChange={setSeguidores} placeholder="12500" />
              <Campo label="Seguindo" value={seguindo} onChange={setSeguindo} placeholder="480" />
              <Campo label="Posts" value={posts} onChange={setPosts} placeholder="132" />
            </div>
            <Button type="submit" disabled={s <= 0} className="w-full">
              Analisar perfil
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Os três números ficam no topo do perfil no app do Instagram.
            </p>
          </form>

          {resultado && (
            <div className="mt-6 rounded-lg border bg-card p-5">
              <p className={`text-lg font-bold ${resultado.cor}`}>{resultado.titulo}</p>
              <p className="mt-1 text-sm text-muted-foreground">{resultado.texto}</p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat icon={<Users className="h-4 w-4" />} label="Seguidores" value={formatNum(s)} highlight />
                <Stat icon={<UserPlus className="h-4 w-4" />} label="Seguidores/Seguindo" value={resultado.razao.toFixed(1)} />
                <Stat
                  icon={<ImageIcon className="h-4 w-4" />}
                  label="Seguidores por post"
                  value={resultado.porPost > 0 ? formatNum(resultado.porPost) : "—"}
                />
              </div>

              {resultado.metas.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="h-4 w-4 text-primary" /> Quanto falta para a próxima meta
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {resultado.metas.map((m) => (
                      <li key={m.alvo}>
                        Para <strong className="text-foreground">{formatNum(m.alvo)}</strong> seguidores faltam{" "}
                        <strong className="text-foreground">{formatNum(m.falta)}</strong>.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Quer <strong className="text-foreground">turbinar</strong> esse perfil?
                </p>
                <Link
                  to="/comprar-seguidores-instagram"
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
            O <strong>contador de seguidores do Instagram</strong> da BoostGG lê os três números públicos do perfil (posts,
            seguidores e seguindo) e transforma isso em diagnóstico: base real ou inflada, nível de autoridade e distância até a
            próxima meta. Não pedimos senha, não instalamos nada e não guardamos suas consultas.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Abra o perfil no Instagram e olhe os três números do topo.</li>
            <li>Digite <strong>seguidores</strong>, <strong>seguindo</strong> e <strong>posts</strong> nos campos acima.</li>
            <li>Clique em <strong>“Analisar perfil”</strong> e veja o diagnóstico na hora.</li>
          </ol>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Por que não puxamos o número automaticamente</h2>
          <p>
            Porque seria mentira. O Instagram bloqueia consultas feitas por servidores — sites que prometem puxar o número
            sozinho entregam dado velho de cache ou simplesmente falham quando você mais precisa. Preferimos uma ferramenta que
            funciona <strong>100% das vezes</strong> e ainda te diz algo que o número sozinho não diz: se aquela base é real.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Contador de seguidores antes de comprar</h2>
          <p>
            Usar o contador de seguidores Instagram antes de{" "}
            <Link to="/comprar-seguidores-instagram" className="text-primary underline">
              comprar seguidores Instagram
            </Link>{" "}
            é o jeito mais inteligente de medir resultado. Anote o número atual, faça o pedido na BoostGG e refaça a análise em
            24 horas para ver o crescimento real.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Para que serve um contador de seguidores</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Analisar concorrentes</strong> antes de investir em conteúdo ou tráfego pago.</li>
            <li><strong>Verificar influenciadores</strong>: razão baixa e poucos posts costumam indicar engajamento fraco.</li>
            <li><strong>Acompanhar o crescimento</strong> de perfis parceiros, clientes ou o seu próprio.</li>
            <li><strong>Validar entregas</strong> de campanhas de seguidores comprados ou orgânicos.</li>
            <li><strong>Benchmark</strong> rápido de nichos e categorias.</li>
          </ul>

          <h2 className="pt-4 text-2xl font-bold text-foreground">Como ler a razão seguidores/seguindo</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Acima de 10</strong> — perfil de autoridade, referência no nicho.</li>
            <li><strong>Entre 1 e 10</strong> — perfil comum em crescimento saudável.</li>
            <li><strong>Abaixo de 1</strong> — segue mais do que é seguido; passa impressão de conta nova.</li>
            <li><strong>Razão altíssima com poucos posts</strong> — sinal clássico de base comprada de baixa qualidade.</li>
          </ul>

          <h2 className="pt-4 text-2xl font-bold text-foreground">É seguro usar?</h2>
          <p>
            Sim. Nunca pedimos sua senha do Instagram, não instalamos nada no seu dispositivo e nada do que você digita sai do
            seu navegador. Sua conta continua 100% segura.
          </p>

          <div className="mt-6 space-y-2 rounded-lg border bg-card p-4 text-sm">
            <p>
              <strong className="text-foreground">Ferramenta relacionada:</strong>{" "}
              <Link to="/ferramentas/calculadora-engajamento-instagram" className="text-primary underline">
                Calculadora de Engajamento Instagram
              </Link>{" "}
              — descubra se o perfil tem engajamento real ou seguidores inflados.
            </p>
            <p>
              <strong className="text-foreground">Contagem ao vivo:</strong>{" "}
              <Link to="/ferramentas/contador-inscritos-youtube" className="text-primary underline">
                Contador de inscritos do YouTube
              </Link>{" "}
              — esse busca o número atualizado sozinho, sem você digitar nada.
            </p>
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

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={12}
      />
    </label>
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
