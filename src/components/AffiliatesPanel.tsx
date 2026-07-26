// v265 — Painel de afiliados no admin: quem indicou, quanto deve, botão de pagar.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listAffiliates, payAffiliate, toggleAffiliate, type AfiliadoRow } from "@/lib/affiliates-admin.functions";

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export default function AffiliatesPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<AfiliadoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const fnList = useServerFn(listAffiliates);
  const fnPay = useServerFn(payAffiliate);
  const fnToggle = useServerFn(toggleAffiliate);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fnList({ data: { token } });
      if (r.ok) setRows(r.afiliados);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void load();
  }, [token]);

  const pagar = async (a: AfiliadoRow) => {
    if (!confirm(`Confirma que você JÁ pagou ${brl(a.saldo_brl)} por Pix para ${a.nome}?`)) return;
    const r = await fnPay({ data: { token, id: a.id } });
    if (!r.ok) return toast.error(r.error ?? "Falhou");
    toast.success("Pagamento registrado");
    void load();
  };

  const alternar = async (a: AfiliadoRow) => {
    const r = await fnToggle({ data: { token, id: a.id, ativo: !a.ativo } });
    if (!r.ok) return toast.error(r.error ?? "Falhou");
    void load();
  };

  const aPagar = rows.reduce((s, a) => s + a.saldo_brl, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Afiliados (indicação) · a pagar {brl(aPagar)}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "..." : "Atualizar"}
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum afiliado cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Afiliado</th>
                  <th className="p-2">Código</th>
                  <th className="p-2">Vendas</th>
                  <th className="p-2">A pagar</th>
                  <th className="p-2">Já pago</th>
                  <th className="p-2">Pix</th>
                  <th className="p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-border/60">
                    <td className="p-2">
                      <div className="font-medium">{a.nome}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </td>
                    <td className="p-2 font-mono text-xs">{a.codigo}</td>
                    <td className="p-2">{a.indicacoes}</td>
                    <td className="p-2 font-semibold">{brl(a.saldo_brl)}</td>
                    <td className="p-2 text-muted-foreground">{brl(a.pago_brl)}</td>
                    <td className="p-2 text-xs break-all">{a.pix_chave ?? "—"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={a.ativo ? "default" : "secondary"}>{a.ativo ? "ativo" : "pausado"}</Badge>
                        {a.saldo_brl > 0 && (
                          <Button size="sm" onClick={() => pagar(a)}>
                            Marcar como pago
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => alternar(a)}>
                          {a.ativo ? "Pausar" : "Reativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          A comissão entra sozinha quando o Pix do cliente indicado é aprovado. Aqui você só confirma o
          Pix que já mandou para o afiliado.
        </p>
      </CardContent>
    </Card>
  );
}
