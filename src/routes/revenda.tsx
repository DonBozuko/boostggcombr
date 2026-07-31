// v262 — Página pública do programa de revenda.
// Objetivo: converter quem já pergunta "vocês têm revenda?" sem abrir cadastro
// automático (triagem manual protege o varejo e evita fraude).
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitResellerApplication } from "@/lib/reseller-apply.functions";

export const Route = createFileRoute("/revenda")({
  head: () => ({
    meta: [
      { title: "Seja Revendedor de Seguidores e Curtidas — Elite Boost Prime | BoostGG" },
      {
        name: "description",
        content:
          "Programa de revenda BoostGG: preço de revenda com desconto real, saldo pré-pago via Pix, API pronta e entrega automática. Você vende com sua marca e fica com o lucro.",
      },
      { property: "og:title", content: "Programa de Revenda — BoostGG" },
      {
        property: "og:description",
        content: "Compre com desconto de revenda, venda pelo preço que quiser e fique com a diferença. Saldo pré-pago em Pix e API pronta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Revenda,
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

function Revenda() {
  const send = useServerFn(submitResellerApplication);
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", volume_mes: "", canal: "", mensagem: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nome.trim().length < 2) return toast.error("Informe seu nome");
    if (form.whatsapp.replace(/\D/g, "").length < 10) return toast.error("Informe um WhatsApp válido com DDD");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      return toast.error("Informe um e-mail válido — é nele que chega seu acesso");
    setBusy(true);
    try {
      const r = await send({ data: form });
      if (!r.ok) return toast.error(r.error ?? "Não consegui enviar agora");
      setDone(true);
      toast.success("Solicitação enviada! Seu acesso chega por e-mail assim que for aprovado.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Programa de Revenda BoostGG</h1>
      <p className="mt-3 text-muted-foreground">
        Você compra no preço de revenda, vende pelo preço que quiser e fica com a diferença. Não é
        comissão: o cliente final é seu, a marca na frente é a sua. A entrega é automática pelo nosso
        sistema, com reposição nos pacotes brasileiros.
      </p>
      <p className="mt-2 text-sm">
        Já é revendedor?{" "}
        <Link to="/painel-revendedor" className="text-primary underline">
          Entrar no painel do revendedor
        </Link>{" "}
        (saldo, recarga por Pix e pedidos).
      </p>


      <p className="mt-2 text-sm text-muted-foreground">
        Antes de decidir:{" "}
        <Link to="/painel-smm" className="text-primary underline">o que vem no painel SMM</Link>,{" "}
        <Link to="/revender-seguidores" className="text-primary underline">como revender seguidores</Link>{" "}
        e a{" "}
        <Link to="/ferramentas/calculadora-lucro-revenda" className="text-primary underline">
          calculadora de lucro
        </Link>
        .
      </p>

      <h2 className="mt-8 text-lg font-semibold">Como funciona</h2>
      <ol className="mt-3 space-y-3">
        <Step n={1} title="Você pede acesso">
          Preenche o formulário abaixo. A gente te chama no WhatsApp, entende seu volume e define seu
          desconto de revenda.
        </Step>
        <Step n={2} title="Deposita saldo via Pix">
          O saldo é pré-pago. Cada pedido debita do seu saldo na hora, sem boleto, sem fatura, sem
          surpresa no fim do mês.
        </Step>
        <Step n={3} title="Vende e envia os pedidos">
          Pelo painel de revendedor (ou integrando a{" "}
          <Link to="/api-revenda" className="text-primary underline">
            API
          </Link>{" "}
          no seu site/bot). Cada pedido entra direto na fila de entrega.
        </Step>
        <Step n={4} title="Seu lucro é a diferença">
          Exemplo: pacote que sai R$ 20 no varejo você paga menos e revende por R$ 25, R$ 30 ou o que
          seu público pagar. A diferença é 100% sua.
        </Step>
      </ol>

      <h2 className="mt-8 text-lg font-semibold">O que você recebe</h2>
      <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <li className="rounded-lg border border-border/60 p-3">Desconto de revenda no catálogo inteiro</li>
        <li className="rounded-lg border border-border/60 p-3">Saldo pré-pago em Pix, sem mensalidade</li>
        <li className="rounded-lg border border-border/60 p-3">API pronta (serviços, saldo, pedido, status)</li>
        <li className="rounded-lg border border-border/60 p-3">Pacotes brasileiros reais com reposição</li>
        <li className="rounded-lg border border-border/60 p-3">Extrato de todos os lançamentos do seu saldo</li>
        <li className="rounded-lg border border-border/60 p-3">Suporte direto com quem opera o sistema</li>
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        Acesso por aprovação: analisamos cada solicitação antes de liberar a chave. Isso protege o preço
        do mercado e mantém a qualidade da entrega para todos os revendedores.
      </p>

      <h2 className="mt-10 text-lg font-semibold">Quero ser revendedor</h2>
      {done ? (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-5">
          <p className="font-semibold">Solicitação recebida.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vamos te chamar no WhatsApp que você informou para combinar desconto e primeiro depósito.
            Enquanto isso, dá uma olhada na{" "}
            <Link to="/api-revenda" className="text-primary underline">
              documentação da API
            </Link>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Seu nome *" value={form.nome} onChange={set("nome")} maxLength={80} required />
            <Input
              placeholder="WhatsApp com DDD *"
              value={form.whatsapp}
              onChange={set("whatsapp")}
              maxLength={25}
              inputMode="tel"
              required
            />
            <Input placeholder="E-mail (para receber seu acesso)" value={form.email} onChange={set("email")} maxLength={160} type="email" />
            <Input
              placeholder="Quanto pretende vender por mês? (ex: R$ 500)"
              value={form.volume_mes}
              onChange={set("volume_mes")}
              maxLength={40}
            />
            <Input
              className="sm:col-span-2"
              placeholder="Onde você vende? (Instagram, site próprio, painel, grupo de WhatsApp...)"
              value={form.canal}
              onChange={set("canal")}
              maxLength={60}
            />
          </div>
          <Textarea
            placeholder="Algo que eu precise saber? (opcional)"
            value={form.mensagem}
            onChange={set("mensagem")}
            maxLength={600}
            rows={3}
          />
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Enviando..." : "Enviar solicitação"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Usamos seus dados apenas para entrar em contato sobre a revenda.
          </p>
        </form>
      )}
    </main>
  );
}
