// v262 — Fila de solicitações de revenda vindas de /revenda.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listResellerApplications,
  setResellerApplicationStatus,
  approveAndProvisionReseller,
  type ResellerApplication,
} from "@/lib/reseller-apply.functions";

const LABEL: Record<string, string> = {
  novo: "novo",
  em_contato: "em contato",
  aprovado: "aprovado",
  recusado: "recusado",
};

export default function ResellerApplicationsPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<ResellerApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const fnList = useServerFn(listResellerApplications);
  const fnStatus = useServerFn(setResellerApplicationStatus);
  const fnApprove = useServerFn(approveAndProvisionReseller);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fnList({ data: { token } });
      if (r.ok) setRows(r.rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void load();
  }, [token]);

  const marcar = async (id: string, status: "em_contato" | "aprovado" | "recusado") => {
    const r = await fnStatus({ data: { token, id, status } });
    if (!r.ok) return toast.error(r.error ?? "Falhou");
    void load();
  };

  const liberar = async (r: ResellerApplication) => {
    if (!r.email) return toast.error("Sem e-mail nessa solicitação — peça o e-mail antes de liberar.");
    const pct = window.prompt(`Desconto de revenda para ${r.nome} (%)`, "10");
    if (pct == null) return;
    const desconto = Number(pct.replace(",", ".")) / 100;
    if (!(desconto >= 0 && desconto <= 0.3)) return toast.error("Desconto entre 0% e 30%");
    const res = await fnApprove({ data: { token, id: r.id, desconto_pct: desconto } });
    if (!res.ok) return toast.error(res.error ?? "Falhou");
    toast.success(
      res.emailed
        ? `Acesso liberado. Chave enviada por e-mail para ${r.email}.`
        : `Acesso criado, mas o e-mail não saiu. Chave: ${res.apiKey}`,
    );
    void load();
  };

  const pendentes = rows.filter((r) => r.status === "novo").length;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          📝 Pedidos de revenda {pendentes > 0 && <Badge className="ml-2">{pendentes} novo(s)</Badge>}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma solicitação ainda. A página pública é /revenda.
          </p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {r.nome} <span className="text-muted-foreground">· {r.whatsapp}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                  {r.volume_mes ? ` · volume ${r.volume_mes}` : ""}
                  {r.canal ? ` · vende em ${r.canal}` : ""}
                  {r.email ? ` · ${r.email}` : ""}
                </p>
                {r.mensagem && <p className="mt-1 text-xs">{r.mensagem}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === "novo" ? "default" : "secondary"}>{LABEL[r.status] ?? r.status}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(`https://wa.me/55${r.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`, "_blank")
                  }
                >
                  WhatsApp
                </Button>
                <Button size="sm" onClick={() => liberar(r)} disabled={!r.email}>
                  Aprovar e liberar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => marcar(r.id, "em_contato")}>
                  Em contato
                </Button>
                <Button size="sm" variant="ghost" onClick={() => marcar(r.id, "aprovado")}>
                  Aprovado
                </Button>
                <Button size="sm" variant="ghost" onClick={() => marcar(r.id, "recusado")}>
                  Recusar
                </Button>
              </div>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          "Aprovar e liberar" faz tudo sozinho: cria o revendedor, gera a chave e envia por e-mail com o
          link do painel. O saldo ele mesmo recarrega por Pix — você não precisa fazer nada depois.
        </p>
      </CardContent>
    </Card>
  );
}
