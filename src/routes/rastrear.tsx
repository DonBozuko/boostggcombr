import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Home, Search, Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consultarPedidoPublico } from "@/lib/consulta-pedido.functions";

export const Route = createFileRoute("/rastrear")({
  head: () => {
    const title = "Rastrear Pedido — BoostGG";
    const description =
      "Acompanhe o status do seu pedido de seguidores, curtidas ou views em tempo real. Basta informar o código do pedido.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: RastrearPage,
});

function RastrearPage() {
  const consultar = useServerFn(consultarPedidoPublico);
  const [pedidoId, setPedidoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("pedido");
    if (q) setPedidoId(q);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = pedidoId.trim();
    if (id.length < 4) {
      setResult({ ok: false, message: "Informe o código do pedido (mínimo 4 caracteres)." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await consultar({ data: { pedidoId: id } });
      setResult({ ok: r.ok, message: r.message });
    } catch {
      setResult({ ok: false, message: "Não consegui consultar agora. Tente novamente em instantes." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <PackageSearch className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold">Rastrear pedido</h1>
          <p className="text-sm text-zinc-400">
            Cole o código do pedido que aparece na tela de confirmação ou no e-mail que enviamos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={pedidoId}
            onChange={(e) => setPedidoId(e.target.value)}
            placeholder="Ex.: 8f3a91c2..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-mono outline-none focus:border-emerald-500/60"
            aria-label="Código do pedido"
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Consultando...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" />Consultar status</>
            )}
          </Button>
        </form>

        {result && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              result.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            {result.message}
          </div>
        )}

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 space-y-2">
          <p>
            Entregas começam em poucos minutos após a confirmação do Pix e podem levar algumas horas
            até completar, dependendo da rede e do tamanho do pacote.
          </p>
          <p>
            Não achou seu pedido? Fale com a gente pelo WhatsApp com o código em mãos que resolvemos.
          </p>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/"><Home className="w-4 h-4 mr-2" />Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
