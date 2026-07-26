// v265 — Página pública do Programa de Afiliados.
// Diferente da revenda: aqui a pessoa não compra nada, só indica com um link e
// recebe comissão em dinheiro quando o Pix do indicado é aprovado.
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signupAffiliate } from "@/lib/affiliate.functions";

export const Route = createFileRoute("/afiliados")({
  head: () => ({
    meta: [
      { title: "Programa de Afiliados — Ganhe indicando | BoostGG" },
      {
        name: "description",
        content:
          "Ganhe 10% de comissão indicando o BoostGG. Cadastro grátis e imediato, link exclusivo, comissão creditada quando o Pix do indicado é aprovado.",
      },
      { property: "og:title", content: "Programa de Afiliados — BoostGG" },
      {
        property: "og:description",
        content: "Indique com seu link e ganhe 10% de cada compra aprovada. Sem custo, sem estoque, sem suporte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Afiliados,
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
        {n}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function Afiliados() {
  const send = useServerFn(signupAffiliate);
  const [form, setForm] = useState({ nome: "", email: "", whatsapp: "", pix_chave: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ codigo: string; link: string; existente: boolean } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nome.trim().length < 2) return toast.error("Informe seu nome");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return toast.error("Informe um e-mail válido");
    if (form.whatsapp.replace(/\D/g, "").length < 10) return toast.error("Informe um WhatsApp com DDD");
    setBusy(true);
    try {
      const r = await send({ data: form });
      if (!r.ok) return toast.error(r.error);
      setResult({ codigo: r.codigo, link: r.link, existente: r.existente });
      toast.success(r.existente ? "Você já tinha cadastro — aqui está seu link." : "Cadastro criado! Seu link está pronto.");
    } finally {
      setBusy(false);
    }
  };

  const copiar = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Link copiado!");
    } catch {
      toast.error("Copie manualmente o link acima");
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Programa de Afiliados BoostGG</h1>
      <p className="mt-3 text-muted-foreground">
        Você indica com um link e ganha <strong>10% de comissão</strong> de cada compra aprovada. Não
        precisa comprar nada, não precisa dar suporte e não precisa entender de tecnologia. Nós
        entregamos o pedido, você só indica.
      </p>
      <p className="mt-2 text-sm">
        Já é afiliado?{" "}
        <Link to="/painel-afiliado" className="text-primary underline">
          Entrar no painel do afiliado
        </Link>
      </p>

      <h2 className="mt-8 text-lg font-semibold">Como funciona</h2>
      <ol className="mt-3 space-y-3">
        <Step n={1} title="Cadastro na hora">
          Preenche o formulário abaixo e recebe seu link exclusivo na mesma tela. Sem espera, sem custo.
        </Step>
        <Step n={2} title="Você divulga o link">
          Story, bio, grupo de WhatsApp, direct. Quem entrar pelo seu link fica marcado como seu por 30
          dias, mesmo que compre depois.
        </Step>
        <Step n={3} title="Comissão cai quando o Pix é aprovado">
          A cada pedido pago pelo seu indicado, 10% entram no seu saldo automaticamente. Pedidos abaixo
          de R$ 10 não geram comissão.
        </Step>
        <Step n={4} title="Você saca por Pix">
          A partir de R$ 20 de saldo você pede o saque no painel e recebemos o pagamento na sua chave
          Pix. Simples assim.
        </Step>
      </ol>

      <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Regras honestas (sem letra miúda)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Comissão só existe sobre pedido efetivamente pago. Pedido estornado não paga.</li>
          <li>Comprar com o próprio link não gera comissão.</li>
          <li>Spam, promessa falsa ou uso da nossa marca como se fosse sua cancela o cadastro.</li>
        </ul>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Quero meu link</h2>
      {result ? (
        <div className="mt-3 space-y-3 rounded-xl border border-primary/40 bg-primary/10 p-5">
          <p className="font-semibold">Seu link de indicação está pronto 🎉</p>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="break-all font-mono text-sm">{result.link}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => copiar(result.link)}>Copiar link</Button>
            <Button variant="outline" asChild>
              <Link to="/painel-afiliado">Abrir meu painel</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Seu código é <strong>{result.codigo}</strong>. Guarde: é com ele e seu e-mail que você entra
            no painel.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Seu nome *" value={form.nome} onChange={set("nome")} maxLength={80} required />
            <Input
              placeholder="Seu e-mail *"
              type="email"
              value={form.email}
              onChange={set("email")}
              maxLength={160}
              required
            />
            <Input
              placeholder="WhatsApp com DDD *"
              value={form.whatsapp}
              onChange={set("whatsapp")}
              maxLength={25}
              inputMode="tel"
              required
            />
            <Input
              placeholder="Sua chave Pix (para receber)"
              value={form.pix_chave}
              onChange={set("pix_chave")}
              maxLength={120}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Criando..." : "Criar meu link grátis"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Usamos seus dados apenas para pagar sua comissão e falar com você sobre o programa.
          </p>
        </form>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Quer vender com a sua própria marca e margem maior em vez de comissão?{" "}
        <Link to="/revenda" className="text-primary underline">
          Conheça o programa de revenda
        </Link>
        .
      </p>
    </main>
  );
}
