// v389 — Página de aquisição da área de revenda: quem procura "painel SMM
// brasileiro" é revendedor pronto, não cliente final. Conteúdo 100% real:
// tudo citado aqui existe (API v1, painel, saldo Pix, reposição BR).
import { createFileRoute, Link } from "@tanstack/react-router";

const CANON = "https://www.boostgg.com.br/painel-smm";
const TITLE = "Painel SMM Brasileiro para Revenda | BoostGG";
const DESC =
  "Painel SMM brasileiro com API pronta, saldo pré-pago em Pix e entrega automática. Revenda seguidores, curtidas e views com sua marca e fique com o lucro.";

const FAQ = [
  {
    q: "O que é um painel SMM?",
    a: "É o sistema que recebe o pedido (link + quantidade) e despacha a entrega automaticamente. No BoostGG você usa o nosso painel pronto ou integra a nossa API no seu próprio site.",
  },
  {
    q: "Preciso pagar mensalidade?",
    a: "Não. Não existe mensalidade nem taxa de setup. Você deposita saldo por Pix e cada pedido debita desse saldo.",
  },
  {
    q: "Qual o depósito mínimo?",
    a: "R$ 20 por recarga, direto no painel do revendedor, com Pix gerado na hora e saldo creditado assim que o pagamento é confirmado.",
  },
  {
    q: "Os serviços são brasileiros?",
    a: "Parte do catálogo é brasileiro real, com reposição. Os pacotes globais ficam marcados como tal — você sempre sabe o que está revendendo.",
  },
  {
    q: "Posso usar minha própria marca?",
    a: "Sim. O cliente final é seu: você define o preço de venda, atende com sua marca e o BoostGG só entrega.",
  },
];

export const Route = createFileRoute("/painel-smm")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Painel SMM Brasileiro para Revenda — BoostGG" },
      { property: "og:description", content: DESC },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Painel SMM Brasileiro para Revenda — BoostGG" },
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
    ],
  }),
  component: PainelSmm,
});

const RECURSOS = [
  ["Saldo pré-pago em Pix", "Recarga a partir de R$ 20 no painel, Pix na hora e crédito automático quando o pagamento cai."],
  ["API v1 pronta", "Quatro ações: catálogo, saldo, criar pedido e status. Mesmo padrão dos painéis SMM que você já conhece."],
  ["Catálogo único", "É a mesma prateleira do site: se o serviço está fora do ar, some pra você também. Nada de vender o que não entrega."],
  ["Preço protegido", "Seu desconto sai da nossa margem, não do custo. O preço do varejo não muda por causa da revenda."],
  ["Reposição nos pacotes BR", "Os pacotes brasileiros com reposição vêm marcados no catálogo, item por item."],
  ["Extrato completo", "Todo débito, crédito e estorno aparece no seu extrato com data, valor e saldo depois."],
];

function PainelSmm() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Área de revenda</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Painel SMM brasileiro para revenda</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Você não precisa montar um painel do zero, negociar com fornecedor gringo nem cuidar de entrega.
        Deposita saldo por Pix, compra no preço de revenda e vende pelo preço que quiser — com a sua marca
        na frente do cliente.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/revenda"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Pedir acesso de revendedor
        </Link>
        <Link to="/api-revenda" className="rounded-lg border border-border/60 px-5 py-2.5 text-sm font-semibold">
          Ver documentação da API
        </Link>
      </div>

      <h2 className="mt-12 text-xl font-semibold">O que vem no painel</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {RECURSOS.map(([t, d]) => (
          <div key={t} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-semibold">Duas formas de operar</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="font-semibold">1. Sem código: painel do revendedor</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Você entra em{" "}
            <Link to="/painel-revendedor" className="text-primary underline">
              /painel-revendedor
            </Link>{" "}
            com sua chave, filtra a rede, cola o link do cliente e envia. Serve pra quem vende por
            Instagram, WhatsApp ou grupo.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="font-semibold">2. Com código: API no seu site</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Um POST cria o pedido e debita seu saldo. Seu site cobra do cliente final do jeito que você
            quiser. Detalhes em{" "}
            <Link to="/api-revenda" className="text-primary underline">
              /api-revenda
            </Link>
            .
          </p>
        </div>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Quanto dá pra ganhar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Depende do seu desconto e do preço que você cobra. Faz a conta antes de decidir na{" "}
        <Link to="/ferramentas/calculadora-lucro-revenda" className="text-primary underline">
          calculadora de lucro de revenda
        </Link>{" "}
        — é grátis e não pede cadastro.
      </p>

      <h2 className="mt-12 text-xl font-semibold">Perguntas frequentes</h2>
      <div className="mt-4 space-y-3">
        {FAQ.map((f) => (
          <div key={f.q} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <h3 className="font-semibold">{f.q}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-primary/40 bg-primary/10 p-6">
        <p className="font-semibold">Pronto pra começar?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          O acesso é por aprovação — a gente entende seu volume e define seu desconto antes de liberar a
          chave.
        </p>
        <Link
          to="/revenda"
          className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Solicitar acesso
        </Link>
      </div>
    </main>
  );
}
