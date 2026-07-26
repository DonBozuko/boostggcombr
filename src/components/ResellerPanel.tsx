import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listResellers,
  createReseller,
  updateReseller,
  creditReseller,
  resellerLedger,
  type Reseller,
} from "@/lib/resellers.functions";

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export default function ResellerPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(false);
  const [novo, setNovo] = useState({ nome: "", email: "", desconto: "10" });
  const [chaveNova, setChaveNova] = useState<string | null>(null);
  const [extrato, setExtrato] = useState<{ id: string; rows: any[] } | null>(null);

  const fnList = useServerFn(listResellers);
  const fnCreate = useServerFn(createReseller);
  const fnUpdate = useServerFn(updateReseller);
  const fnCredit = useServerFn(creditReseller);
  const fnLedger = useServerFn(resellerLedger);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fnList({ data: { token } });
      if (r.ok) setRows(r.resellers);
      else toast.error("Sem permissão para ver revendedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) void load(); }, [token]);

  const criar = async () => {
    const desconto = Number(novo.desconto) / 100;
    if (!novo.nome.trim() || !novo.email.includes("@")) return toast.error("Preencha nome e e-mail");
    if (!(desconto >= 0 && desconto <= 0.3)) return toast.error("Desconto entre 0% e 30%");
    const r = await fnCreate({ data: { token, nome: novo.nome.trim(), email: novo.email.trim(), desconto_pct: desconto } });
    if (!r.ok) return toast.error(r.error ?? "Falhou");
    setChaveNova(r.apiKey ?? null);
    setNovo({ nome: "", email: "", desconto: "10" });
    void load();
  };

  const creditar = async (id: string) => {
    const v = window.prompt("Valor a lançar (use negativo para retirar):", "50");
    if (v == null) return;
    const valor = Number(v.replace(",", "."));
    if (!Number.isFinite(valor)) return toast.error("Valor inválido");
    const r = await fnCredit({ data: { token, id, valor } });
    if (!r.ok) return toast.error(r.error ?? "Falhou");
    toast.success(`Novo saldo: ${brl(r.saldo ?? 0)}`);
    void load();
  };

  const verExtrato = async (id: string) => {
    const r = await fnLedger({ data: { token, id } });
    if (!r.ok) return toast.error("Falhou");
    setExtrato({ id, rows: r.rows });
  };

  const toggle = async (r: Reseller) => {
    const res = await fnUpdate({ data: { token, id: r.id, ativo: !r.ativo } });
    if (!res.ok) return toast.error(res.error ?? "Falhou");
    void load();
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">🤝 Revendedores (API)</CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <Input placeholder="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <Input placeholder="E-mail" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          <Input placeholder="Desconto %" value={novo.desconto} onChange={(e) => setNovo({ ...novo, desconto: e.target.value })} />
          <Button onClick={criar}>Criar revendedor</Button>
        </div>

        {chaveNova && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="font-semibold">Chave gerada — copie agora, ela não aparece de novo:</p>
            <code className="mt-1 block break-all rounded bg-background/70 p-2 text-xs">{chaveNova}</code>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => { void navigator.clipboard.writeText(chaveNova); toast.success("Copiada"); }}>
              Copiar
            </Button>
          </div>
        )}

        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum revendedor cadastrado ainda.</p>}

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border border-border/60 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {r.nome} <span className="text-muted-foreground">· {r.email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    chave {r.api_key_prefix}… · desconto {(r.desconto_pct * 100).toFixed(0)}% · {r.pedidos} pedidos · {brl(r.faturado)} faturado
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "ativo" : "pausado"}</Badge>
                  <span className="font-mono">{brl(r.saldo_brl)}</span>
                  <Button size="sm" variant="outline" onClick={() => creditar(r.id)}>Saldo</Button>
                  <Button size="sm" variant="outline" onClick={() => verExtrato(r.id)}>Extrato</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(r)}>{r.ativo ? "Pausar" : "Ativar"}</Button>
                </div>
              </div>

              {extrato?.id === r.id && (
                <div className="mt-2 max-h-56 overflow-auto rounded bg-muted/30 p-2 text-xs">
                  {extrato.rows.length === 0 && <p>Sem lançamentos.</p>}
                  {extrato.rows.map((l, i) => (
                    <div key={i} className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-0">
                      <span>{new Date(l.created_at).toLocaleString("pt-BR")} · {l.tipo}</span>
                      <span className={l.valor < 0 ? "text-destructive" : "text-emerald-500"}>
                        {l.valor < 0 ? "" : "+"}{brl(l.valor)} → {brl(l.saldo_depois)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          O desconto sai da margem existente e é cortado automaticamente se algum pacote não sustentar o lucro mínimo.
          O preço do site não muda.
        </p>
      </CardContent>
    </Card>
  );
}
