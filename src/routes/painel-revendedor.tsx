// v263 — Painel do revendedor: entra com a chave de API, vê saldo/extrato,
// recarrega por Pix (crédito automático) e envia pedidos.
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  resellerMe,
  resellerTopup,
  resellerTopupStatus,
  resellerCatalog,
  resellerPlaceOrder,
  type PortalData,
  type PortalService,
} from "@/lib/reseller-portal.functions";
import { forgotResellerKey } from "@/lib/reseller-apply.functions";

const STORAGE_KEY = "bgg_reseller_key";

export const Route = createFileRoute("/painel-revendedor")({
  head: () => ({
    meta: [
      { title: "Painel do Revendedor — Elite Boost Prime | BoostGG" },
      {
        name: "description",
        content:
          "Área do revendedor BoostGG: consulte seu saldo, recarregue por Pix com crédito automático, envie pedidos e acompanhe seu extrato.",
      },
      { property: "og:title", content: "Painel do Revendedor — BoostGG" },
      { property: "og:description", content: "Saldo, recarga Pix automática, pedidos e extrato do revendedor BoostGG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PainelRevendedor,
});

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function PainelRevendedor() {
  const fnMe = useServerFn(resellerMe);
  const fnTopup = useServerFn(resellerTopup);
  const fnTopupStatus = useServerFn(resellerTopupStatus);
  const fnCatalog = useServerFn(resellerCatalog);
  const fnOrder = useServerFn(resellerPlaceOrder);

  const fnForgot = useServerFn(forgotResellerKey);

  const [apiKey, setApiKey] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [busy, setBusy] = useState(false);

  const [services, setServices] = useState<PortalService[]>([]);
  const [service, setService] = useState("");
  const [link, setLink] = useState("");

  const [valor, setValor] = useState(100);
  const [pix, setPix] = useState<{ topupId: string; qrCode: string; qrCodeBase64: string; valor: number } | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (key: string) => {
      const r = await fnMe({ data: { apiKey: key } });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui entrar");
        return false;
      }
      setData(r);
      const c = await fnCatalog({ data: { apiKey: key } });
      if (c.ok) setServices(c.services);
      return true;
    },
    [fnMe, fnCatalog],
  );

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      setApiKey(saved);
      void load(saved);
    }
  }, [load]);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const ok = await load(keyInput.trim());
      if (ok) {
        setApiKey(keyInput.trim());
        window.sessionStorage.setItem(STORAGE_KEY, keyInput.trim());
      }
    } finally {
      setBusy(false);
    }
  };

  const recuperar = async () => {
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail.trim())) return toast.error("Informe seu e-mail de cadastro");
    setBusy(true);
    try {
      const r = await fnForgot({ data: { email: forgotEmail.trim() } });
      toast[r.ok ? "success" : "error"](r.message);
      if (r.ok) { setForgotOpen(false); setForgotEmail(""); }
    } finally {
      setBusy(false);
    }
  };

  const sair = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setApiKey("");
    setData(null);
    setPix(null);
    if (poll.current) clearInterval(poll.current);
  };

  const gerarPix = async () => {
    setBusy(true);
    try {
      const r = await fnTopup({ data: { apiKey, valor } });
      if (!r.ok || !r.topupId) return toast.error(r.error ?? "Não consegui gerar o Pix");
      setPix({ topupId: r.topupId, qrCode: r.qrCode ?? "", qrCodeBase64: r.qrCodeBase64 ?? "", valor: r.valor ?? valor });
      if (poll.current) clearInterval(poll.current);
      poll.current = setInterval(async () => {
        const s = await fnTopupStatus({ data: { apiKey, topupId: r.topupId! } });
        if (s.ok && s.status === "credited") {
          if (poll.current) clearInterval(poll.current);
          setPix(null);
          toast.success("Recarga confirmada! Saldo creditado.");
          void load(apiKey);
        }
      }, 6000);
    } finally {
      setBusy(false);
    }
  };

  const enviarPedido = async () => {
    if (!service) return toast.error("Escolha um pacote");
    if (link.trim().length < 2) return toast.error("Informe o @usuário ou link");
    setBusy(true);
    try {
      const r = await fnOrder({ data: { apiKey, service, link: link.trim() } });
      if (!r.ok) return toast.error(r.error ?? "Pedido não entrou");
      toast.success(`Pedido criado. Saldo: R$ ${r.balance}`);
      setLink("");
      void load(apiKey);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-2xl font-bold">Painel do Revendedor</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com a chave de API que você recebeu. Ainda não é revendedor?{" "}
          <Link to="/revenda" className="text-primary underline">Peça acesso aqui</Link>.
        </p>
        <form onSubmit={entrar} className="mt-6 space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
          <Input
            placeholder="bgg_..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            autoComplete="off"
            maxLength={80}
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Não precisa saber programar: cole a chave, recarregue por Pix e peça. Sua chave fica só neste
            navegador, nesta aba — nunca compartilhe com ninguém.
          </p>
        </form>

        <div className="mt-4 rounded-xl border border-border/60 bg-card/20 p-4">
          {!forgotOpen ? (
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm text-primary underline"
            >
              Esqueci minha chave
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                Informe o e-mail do seu cadastro. Enviamos uma chave nova e cancelamos a antiga na hora.
              </p>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                maxLength={160}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={recuperar} disabled={busy}>
                  {busy ? "Enviando..." : "Enviar nova chave"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setForgotOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Olá, {data.nome}</h1>
          <p className="text-sm text-muted-foreground">
            Desconto de revenda: {((data.desconto_pct ?? 0) * 100).toFixed(0)}% ·{" "}
            <Link to="/api-revenda" className="text-primary underline">documentação da API</Link>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={sair}>Sair</Button>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader><CardTitle className="text-base">Saldo disponível</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold">{brl(data.saldo ?? 0)}</p>
          {pix ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-background p-4">
              <p className="text-sm font-semibold">Pix de {brl(pix.valor)} gerado — pague para creditar</p>
              {pix.qrCodeBase64 && (
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code Pix da recarga"
                  className="h-52 w-52 rounded bg-white p-2"
                />
              )}
              <textarea readOnly value={pix.qrCode} rows={3} className="w-full rounded border bg-muted p-2 text-xs" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { void navigator.clipboard.writeText(pix.qrCode); toast.success("Código copiado"); }}>
                  Copiar código Pix
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPix(null)}>Cancelar</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Assim que o Pix cair, o saldo entra sozinho aqui — não precisa avisar ninguém.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {[50, 100, 300, 500, 1000].map((v) => (
                <Button key={v} size="sm" variant={valor === v ? "default" : "outline"} onClick={() => setValor(v)}>
                  {brl(v)}
                </Button>
              ))}
              <Input
                type="number"
                min={20}
                max={20000}
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
                className="w-28"
              />
              <Button onClick={gerarPix} disabled={busy || valor < 20}>
                {busy ? "Gerando..." : "Recarregar por Pix"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo pedido</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Escolha o pacote…</option>
              {services.map((s) => (
                <option key={s.service} value={s.service}>
                  {s.name} — {brl(s.price)} (varejo {brl(s.retail)}){s.refill ? " · com reposição" : ""}
                </option>
              ))}
            </select>
            <Input placeholder="@usuario ou link do post" value={link} onChange={(e) => setLink(e.target.value)} maxLength={200} />
          </div>
          <Button onClick={enviarPedido} disabled={busy}>Enviar pedido</Button>
          <p className="text-xs text-muted-foreground">
            O valor é debitado do seu saldo na hora e o pedido entra direto na fila de entrega.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Seus pedidos</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.pedidos ?? []).length === 0 && <p className="text-muted-foreground">Nenhum pedido ainda.</p>}
            {(data.pedidos ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded border border-border/60 p-2">
                <span>
                  {p.pacote} · {p.quantidade.toLocaleString("pt-BR")}
                  <span className="block text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</span>
                </span>
                <span className="text-right">
                  <Badge variant="secondary">{p.status}</Badge>
                  <span className="block text-xs">{brl(p.valor)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Extrato do saldo</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.ledger ?? []).length === 0 && <p className="text-muted-foreground">Sem lançamentos ainda.</p>}
            {(data.ledger ?? []).map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded border border-border/60 p-2">
                <span>
                  {l.detalhe || l.tipo}
                  <span className="block text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                </span>
                <span className={`text-right ${l.valor >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {l.valor >= 0 ? "+" : "−"}{brl(Math.abs(l.valor))}
                  <span className="block text-xs text-muted-foreground">saldo {brl(l.saldo_depois)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
