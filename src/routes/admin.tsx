import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listarPedidosPagos, reprocessarPedido } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · BoostGram" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

type Pedido = {
  id: string;
  created_at: string;
  status: string;
  pacote: string;
  quantidade: number;
  instagram_user: string;
  mercado_pago_id: string | null;
};

function AdminPage() {
  const listar = useServerFn(listarPedidosPagos);
  const reprocessar = useServerFn(reprocessarPedido);
  const [token, setToken] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return toast.error("Informe o token");
    setLoading(true);
    try {
      const res = await listar({ data: { token } });
      if (!res.ok) return toast.error(`Falhou: ${res.error}`);
      setPedidos(res.pedidos as Pedido[]);
    } finally {
      setLoading(false);
    }
  };

  const reenviar = async (id: string) => {
    setBusyId(id);
    try {
      const res = await reprocessar({ data: { token, pedidoId: id } });
      if (!res.ok) toast.error(`Falhou: ${res.error}${"detail" in res ? ` — ${res.detail}` : ""}`);
      else toast.success(`Enviado! order=${res.orderId ?? "-"}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Admin · Reprocessar pedidos</h1>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="ADMIN_TOKEN"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1"
          />
          <Button onClick={load} disabled={loading}>
            {loading ? "Carregando..." : "Listar pagos"}
          </Button>
        </div>

        <div className="border border-border rounded-lg divide-y divide-border">
          {pedidos.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhum pedido carregado.</div>
          )}
          {pedidos.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                <div>
                  <span className="font-semibold">{p.pacote}</span> · {p.quantidade} · @{p.instagram_user}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("pt-BR")} · MP: {p.mercado_pago_id ?? "-"}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => reenviar(p.id)}
                disabled={busyId === p.id}
              >
                {busyId === p.id ? "Enviando..." : "Reenviar SMM"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
