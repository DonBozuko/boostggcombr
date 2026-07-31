// v389 — Calculadora de lucro de revenda. Matemática 100% no cliente, honesta:
// nada de "ganhe R$ 10.000/mês", só a conta que o próprio revendedor faria.
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";

const CANON = "https://www.boostgg.com.br/ferramentas/calculadora-lucro-revenda";
const TITLE = "Calculadora de Lucro de Revenda SMM — Elite Boost Prime | BoostGG";
const DESC =
  "Calcule grátis quanto sobra ao revender seguidores e curtidas: custo de revenda, preço de venda, lucro por pedido e lucro no mês. Sem cadastro.";

export const Route = createFileRoute("/ferramentas/calculadora-lucro-revenda")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Calculadora de Lucro de Revenda SMM — BoostGG" },
      { property: "og:description", content: DESC },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Calculadora de Lucro de Revenda SMM — BoostGG" },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: CANON }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Calculadora de Lucro de Revenda SMM",
          url: CANON,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
        }),
      },
    ],
  }),
  component: CalculadoraLucroRevenda,
});

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
const num = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function CalculadoraLucroRevenda() {
  const [varejo, setVarejo] = useState("20");
  const [desconto, setDesconto] = useState("15");
  const [venda, setVenda] = useState("25");
  const [pedidos, setPedidos] = useState("30");

  const r = useMemo(() => {
    const v = num(varejo);
    const d = Math.min(30, Math.max(0, num(desconto))) / 100;
    const p = num(venda);
    const q = Math.round(num(pedidos));
    const custo = Number((v * (1 - d)).toFixed(2));
    const lucro = Number((p - custo).toFixed(2));
    const margem = p > 0 ? (lucro / p) * 100 : 0;
    return { custo, lucro, margem, mes: Number((lucro * q).toFixed(2)), q };
  }, [varejo, desconto, venda, pedidos]);

  const prejuizo = r.lucro <= 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ferramenta grátis</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Calculadora de lucro de revenda</h1>
      <p className="mt-3 text-muted-foreground">
        Coloque o preço de varejo do pacote, o desconto de revenda que você tem e o preço que pretende
        cobrar. A conta é feita no seu navegador — nada é enviado nem salvo.
      </p>

      <div className="mt-6 grid gap-4 rounded-xl border border-border/60 bg-card/40 p-5 sm:grid-cols-2">
        <label className="text-sm">
          Preço de varejo do pacote (R$)
          <Input className="mt-1" value={varejo} onChange={(e) => setVarejo(e.target.value)} inputMode="decimal" />
        </label>
        <label className="text-sm">
          Seu desconto de revenda (%)
          <Input className="mt-1" value={desconto} onChange={(e) => setDesconto(e.target.value)} inputMode="decimal" />
          <span className="mt-1 block text-xs text-muted-foreground">Teto do programa: 30%.</span>
        </label>
        <label className="text-sm">
          Preço que você vai cobrar (R$)
          <Input className="mt-1" value={venda} onChange={(e) => setVenda(e.target.value)} inputMode="decimal" />
        </label>
        <label className="text-sm">
          Pedidos por mês
          <Input className="mt-1" value={pedidos} onChange={(e) => setPedidos(e.target.value)} inputMode="numeric" />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">Você paga</p>
          <p className="mt-1 text-lg font-bold">{brl(r.custo)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${prejuizo ? "border-destructive/50 bg-destructive/5" : "border-border/60"}`}>
          <p className="text-xs text-muted-foreground">Lucro por pedido</p>
          <p className="mt-1 text-lg font-bold">{brl(r.lucro)}</p>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">Margem</p>
          <p className="mt-1 text-lg font-bold">{r.margem.toFixed(1)}%</p>
        </div>
        <div className={`rounded-xl border p-4 ${prejuizo ? "border-destructive/50 bg-destructive/5" : "border-primary/40 bg-primary/10"}`}>
          <p className="text-xs text-muted-foreground">Lucro no mês ({r.q} pedidos)</p>
          <p className="mt-1 text-lg font-bold">{brl(r.mes)}</p>
        </div>
      </div>

      {prejuizo && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          Nesse preço você vende no prejuízo (ou empatado). Suba o preço de venda ou negocie um desconto
          maior antes de anunciar.
        </p>
      )}

      <h2 className="mt-10 text-xl font-semibold">Como usar esse número</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        <li className="rounded-lg border border-border/60 p-3">
          Reserve parte do lucro pra reembolso e reposição: um pedido problemático por semana já muda a conta.
        </li>
        <li className="rounded-lg border border-border/60 p-3">
          Se você cobra por cartão ou gateway próprio, desconte a taxa dele do preço de venda antes de digitar aqui.
        </li>
        <li className="rounded-lg border border-border/60 p-3">
          Margem abaixo de 20% costuma não pagar o seu tempo de suporte. Prefira poucos pacotes com margem boa.
        </li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Quer operar com esses números de verdade? Veja o{" "}
        <Link to="/painel-smm" className="text-primary underline">
          painel SMM de revenda
        </Link>
        , o guia de{" "}
        <Link to="/revender-seguidores" className="text-primary underline">
          como revender seguidores
        </Link>{" "}
        ou peça acesso em{" "}
        <Link to="/revenda" className="text-primary underline">
          /revenda
        </Link>
        .
      </p>
    </main>
  );
}
