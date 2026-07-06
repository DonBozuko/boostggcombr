import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, Database, Mail, TrendingUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade e Segurança — EliteBoost Prime" },
      {
        name: "description",
        content:
          "Como a EliteBoost Prime coleta, usa e protege seus dados. Página mantida pela EliteBoost Prime para esclarecer dúvidas sobre privacidade e segurança.",
      },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div className="dark min-h-screen text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
              <TrendingUp className="size-4 text-background" />
            </div>
            <span className="font-display font-bold text-lg">EliteBoost Prime</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar à página inicial
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">
            Privacidade & Segurança
          </h1>
          <p className="mt-4 text-muted-foreground">
            Esta página é mantida pela EliteBoost Prime para responder dúvidas comuns
            sobre segurança e privacidade no uso dos nossos serviços. Não é uma
            certificação independente.
          </p>
        </div>

        <div className="space-y-8">
          <Section
            icon={Database}
            title="Quais dados coletamos"
          >
            Para processar um pedido, coletamos apenas três informações
            fornecidas voluntariamente no formulário: o pacote escolhido, o @
            ou link público do perfil de Instagram e um número de WhatsApp
            para contato. Não pedimos e nunca armazenamos a senha da sua
            conta de Instagram.
          </Section>

          <Section icon={Lock} title="Como esses dados são protegidos">
            Os dados do pedido são armazenados em banco de dados gerenciado
            com acesso restrito ao backend da EliteBoost Prime. O acesso público de
            leitura está bloqueado por políticas explícitas — nenhum visitante
            consegue listar pedidos de outros clientes pelo navegador.
          </Section>

          <Section icon={ShieldCheck} title="Acesso ao seu perfil">
            Nunca solicitaremos sua senha. Trabalhamos exclusivamente com o @
            público do perfil. Sua conta nunca é acessada por nós, nem é
            necessário conceder qualquer permissão dentro do Instagram.
          </Section>

          <Section icon={Mail} title="Uso do WhatsApp informado">
            O número de WhatsApp é utilizado apenas para enviar o Pix de
            pagamento, o comprovante e atualizações sobre o pedido. Não é
            usado para marketing de terceiros e não é compartilhado.
          </Section>

          <Section icon={Database} title="Retenção e exclusão (LGPD)">
            Os dados pessoais do pedido (@ do perfil e WhatsApp) são
            automaticamente anonimizados após 5 anos. Para pedir a exclusão
            imediata dos seus dados de um pedido específico, use o formulário
            abaixo com o ID do pagamento do Mercado Pago que você recebeu.
            <LgpdDeleteForm />
          </Section>

          <Section icon={ShieldCheck} title="Contato de segurança">
            Encontrou um problema de segurança ou tem dúvidas sobre o
            tratamento dos seus dados? Fale com a equipe da EliteBoost Prime pelo
            mesmo WhatsApp de atendimento usado no fluxo de compra.
          </Section>
        </div>

        <p className="mt-16 text-xs text-muted-foreground">
          EliteBoost Prime não é afiliada ao Instagram ou à Meta. Esta página descreve
          práticas atuais da EliteBoost Prime e pode ser atualizada conforme o serviço
          evolui.
        </p>
      </main>

      <footer className="border-t border-border py-10 mt-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[image:var(--gradient-cta)]" />
            <span className="font-display font-semibold text-foreground">
              EliteBoost Prime
            </span>
          </div>
          <p>© 2026 EliteBoost Prime. Não somos afiliados ao Instagram ou Meta.</p>
        </div>
      </footer>
    </div>
  );
}

function LgpdDeleteForm() {
  const [mpId, setMpId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/public/lgpd-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mercado_pago_id: mpId.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      setResult(json);
      if (json.ok) setMpId("");
    } catch {
      setResult({ ok: false, message: "Falha de rede. Tente novamente." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        value={mpId}
        onChange={(e) => setMpId(e.target.value)}
        placeholder="ID do pagamento Mercado Pago"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        maxLength={60}
        required
      />
      <button
        type="submit"
        disabled={busy || mpId.trim().length < 4}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Enviando…" : "Excluir meus dados"}
      </button>
      {result && (
        <p className={`sm:w-full text-xs mt-1 ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
          <Icon className="size-5 text-background" />
        </div>
        <h2 className="font-display font-bold text-xl">{title}</h2>
      </div>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </section>
  );
}
