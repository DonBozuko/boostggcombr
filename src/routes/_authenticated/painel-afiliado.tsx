// v265 — Painel do afiliado. Login simples por código + e-mail (não guarda dinheiro
// do cliente nem dado sensível; saque é aprovado manualmente no admin).
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { affiliateDashboard, type AffiliateDashboard } from "@/lib/affiliate.functions";

export const Route = createFileRoute("/painel-afiliado")({
  head: () => ({
    meta: [
      { title: "Painel do Afiliado — BoostGG" },
      { name: "description", content: "Acompanhe suas indicações, comissões e saldo do programa de afiliados BoostGG." },
      { property: "og:title", content: "Painel do Afiliado — BoostGG" },
      { property: "og:description", content: "Saldo, comissões e link de indicação em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PainelAfiliado,
});

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function PainelAfiliado() {
  const load = useServerFn(affiliateDashboard);
  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [dash, setDash] = useState<Extract<AffiliateDashboard, { ok: true }> | null>(null);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await load({ data: { codigo, email } });
      if (!r.ok) return toast.error(r.error);
      setDash(r);
    } finally {
      setBusy(false);
    }
  };

  if (!dash) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold">Painel do Afiliado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com o código que você recebeu no cadastro e o mesmo e-mail.
        </p>
        <form onSubmit={entrar} className="mt-5 space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
          <Input placeholder="Seu código (ex: MARIA4K2Z)" value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={16} required />
          <Input placeholder="Seu e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} required />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Ainda não é afiliado?{" "}
          <Link to="/afiliados" className="text-primary underline">
            Criar meu link grátis
          </Link>
        </p>
      </main>
    );
  }

  const podeSacar = dash.saldo >= 20;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Olá, {dash.nome} 👋</h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
          <p className="text-xs text-muted-foreground">Saldo disponível</p>
          <p className="text-2xl font-bold">{brl(dash.saldo)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Total já ganho</p>
          <p className="text-2xl font-bold">{brl(dash.totalGanho)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Já pago a você</p>
          <p className="text-2xl font-bold">{brl(dash.pago)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="text-sm font-semibold">Seu link de indicação ({Math.round(dash.comissaoPct * 100)}% de comissão)</p>
        <p className="mt-2 break-all font-mono text-sm">{dash.link}</p>
        <Button
          className="mt-3"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(dash.link);
              toast.success("Link copiado!");
            } catch {
              toast.error("Copie manualmente o link acima");
            }
          }}
        >
          Copiar link
        </Button>
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="text-sm font-semibold">Saque</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {podeSacar
            ? "Você já pode sacar. Chame no WhatsApp do suporte informando seu código — o pagamento sai na sua chave Pix cadastrada."
            : `Saque liberado a partir de ${brl(20)} de saldo. Falta ${brl(Math.max(0, 20 - dash.saldo))}.`}
        </p>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Suas comissões</h2>
      {dash.comissoes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma comissão ainda. Divulgue seu link — a primeira compra aprovada já aparece aqui.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Pedido</th>
                <th className="p-3">Sua comissão</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {dash.comissoes.map((c, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="p-3">{new Date(c.data).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">{brl(c.valorPedido)}</td>
                  <td className="p-3 font-semibold text-primary">{brl(c.comissao)}</td>
                  <td className="p-3">{c.status === "paga" ? "Paga" : "Liberada"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
