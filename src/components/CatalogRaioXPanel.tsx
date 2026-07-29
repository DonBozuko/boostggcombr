// v362 — Painel "Raio-X do fornecedor": o que mudou de ID, preço e custo nas
// últimas 48h, em português direto. Read-only.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCatalogRaioX, type RaioXPayload } from "@/lib/catalog-raiox.functions";

const rotulo: Record<string, string> = {
  id: "Trocou de ID",
  preco: "Mudou preço da vitrine",
  custo: "Mudou custo do fornecedor",
  outro: "Outra mudança",
};

const cor: Record<string, string> = {
  id: "text-amber-400",
  preco: "text-sky-400",
  custo: "text-fuchsia-400",
  outro: "text-muted-foreground",
};

export function CatalogRaioXPanel({ token }: { token: string }) {
  const fn = useServerFn(getCatalogRaioX);
  const [d, setD] = useState<RaioXPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const load = () => {
      fn({ data: { token } })
        .then((r: any) => {
          if (!vivo) return;
          if (r?.ok) { setD(r); setErr(null); } else setErr(r?.error ?? "erro");
        })
        .catch((e) => vivo && setErr(e?.message ?? String(e)));
    };
    load();
    const i = setInterval(load, 60_000);
    return () => { vivo = false; clearInterval(i); };
  }, [token]);

  if (err) return <div className="rounded-lg border border-border p-4 text-sm text-destructive">Raio-X indisponível: {err}</div>;
  if (!d) return <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Lendo mudanças…</div>;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Raio-X do fornecedor (48h)</h3>
        <span className="text-[11px] text-muted-foreground">atualiza sozinho a cada 60s</span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {(["id", "preco", "custo", "outro"] as const).map((k) => (
          <div key={k} className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotulo[k]}</div>
            <div className={`text-lg font-bold ${cor[k]}`}>{d.por_tipo[k]}</div>
          </div>
        ))}
      </div>

      {d.trocas_de_produto.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-destructive">
            Fornecedor trocou o produto por trás do mesmo ID
          </div>
          <ul className="mt-1 space-y-1 text-xs">
            {d.trocas_de_produto.map((t, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="text-foreground">{t.pacote}</span> · {t.provider} · virou “{t.nome}”
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 max-h-80 overflow-auto">
        {d.linhas.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhuma mudança nas últimas 48h.</div>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {d.linhas.map((l, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{l.pacote}</td>
                  <td className={`py-1 pr-2 ${cor[l.tipo]}`}>{rotulo[l.tipo]}</td>
                  <td className="py-1 pr-2 text-muted-foreground">{l.antes} → <span className="text-foreground">{l.depois}</span></td>
                  <td className="py-1 text-right text-muted-foreground">
                    {l.quando ? new Date(l.quando).toLocaleString("pt-BR") : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
