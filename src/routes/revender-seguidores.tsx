// v389 — Conteúdo de topo de funil da área de revenda: "como revender
// seguidores". Sem promessa fantasia: só o que o sistema realmente faz.
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageGuide } from "@/components/PageGuide";

const CANON = "https://www.boostgg.com.br/revender-seguidores";
const TITLE = "Como Revender Seguidores e Curtidas em 2026 | BoostGG";
const DESC =
  "Passo a passo para revender seguidores e curtidas no Brasil: onde comprar no atacado, como precificar e quanto sobra de lucro.";

const PASSOS = [
  {
    t: "1. Escolha o que você vai vender",
    d: "Comece com 2 ou 3 pacotes só (ex: seguidores Instagram BR, curtidas e views TikTok). Catálogo gigante confunde o cliente e trava sua decisão de preço.",
  },
  {
    t: "2. Consiga preço de atacado",
    d: "Revenda só faz sentido se você compra abaixo do varejo. No BoostGG o desconto de revenda é contratado por conta e o preço do site não muda por causa disso.",
  },
  {
    t: "3. Trabalhe com saldo pré-pago",
    d: "Deposita por Pix e cada pedido debita do saldo. Isso evita o erro clássico do revendedor iniciante: gastar o dinheiro do cliente antes de pagar a entrega.",
  },
  {
    t: "4. Precifique com margem, não com achismo",
    d: "Some seu custo, sua taxa de recebimento e o suporte que você vai dar. Depois defina o preço. Nossa calculadora faz essa conta em segundos.",
  },
  {
    t: "5. Automatize a entrega",
    d: "Envio manual quebra na primeira madrugada. Use o painel do revendedor ou a API v1 pra o pedido entrar na fila sozinho, com status rastreável.",
  },
  {
    t: "6. Combine o pós-venda antes de vender",
    d: "Diga ao cliente o prazo real e o que acontece se cair. Nos pacotes brasileiros com reposição você tem cobertura; nos globais, não prometa o que não existe.",
  },
];

const ERROS = [
  "Prometer entrega instantânea em pacote que leva horas.",
  "Vender serviço que está fora do ar no fornecedor.",
  "Cobrar tão barato que um único reembolso apaga o lucro do dia.",
  "Guardar o link do cliente no WhatsApp e perder o pedido.",
  "Depender de um fornecedor só, sem plano B.",
];

export const Route = createFileRoute("/revender-seguidores")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Como Revender Seguidores e Curtidas — BoostGG" },
      { property: "og:description", content: DESC },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Como Revender Seguidores e Curtidas — BoostGG" },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: CANON }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Como revender seguidores e curtidas",
          description: DESC,
          step: PASSOS.map((p, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: p.t.replace(/^\d+\.\s*/, ""),
            text: p.d,
          })),
        }),
      },
    ],
  }),
  component: RevenderSeguidores,
});

function RevenderSeguidores() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Área de revenda</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Como revender seguidores e curtidas</h1>
      <p className="mt-4 text-muted-foreground">
        Revenda de serviços de redes sociais é um negócio simples de operar e fácil de quebrar: quem perde
        dinheiro quase sempre erra em preço, entrega ou promessa. Abaixo está o caminho que a gente vê dar
        certo com os revendedores que operam no nosso sistema.
      </p>

      <h2 className="mt-10 text-xl font-semibold">O passo a passo</h2>
      <ol className="mt-4 space-y-3">
        {PASSOS.map((p) => (
          <li key={p.t} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="font-semibold">{p.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-xl font-semibold">Cinco erros que matam a margem</h2>
      <ul className="mt-4 space-y-2">
        {ERROS.map((e) => (
          <li key={e} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            {e}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Fazendo a conta</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Antes de anunciar qualquer preço, rode os números na{" "}
        <Link to="/ferramentas/calculadora-lucro-revenda" className="text-primary underline">
          calculadora de lucro de revenda
        </Link>
        . Ela mostra o lucro por pedido e no mês, já considerando o desconto que você tem.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Onde comprar para revender</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No BoostGG a revenda usa o mesmo catálogo e as mesmas travas de entrega do site — você não herda um
        estoque paralelo desatualizado. Veja o{" "}
        <Link to="/painel-smm" className="text-primary underline">
          painel SMM de revenda
        </Link>
        , a{" "}
        <Link to="/api-revenda" className="text-primary underline">
          API v1
        </Link>{" "}
        ou peça acesso direto em{" "}
        <Link to="/revenda" className="text-primary underline">
          /revenda
        </Link>
        .
      </p>

      <p className="mt-8 text-sm text-muted-foreground">
        Prefere ganhar por indicação em vez de operar pedidos? Existe também o{" "}
        <Link to="/afiliados" className="text-primary underline">
          programa de afiliados
        </Link>
        .
      </p>
      <PageGuide page="revender-seguidores" />
    </main>
  );
}
