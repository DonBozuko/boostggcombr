import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { inspectAllRoutes, type InspectRow } from "@/lib/gsc-inspect.functions";

export const Route = createFileRoute("/dashboard/seo")({
  head: () => ({
    meta: [
      { title: "SEO Dashboard | BoostGG" },
      { name: "description", content: "Status de indexação e cobertura Google Search Console." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SeoDashboard,
  errorComponent: ({ error }) => (
    <div className="p-6 text-red-400">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
});

const VERDICT_STYLES: Record<string, string> = {
  PASS: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  PARTIAL: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  FAIL: "bg-red-500/20 text-red-300 border-red-500/40",
  NEUTRAL: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  VERDICT_UNSPECIFIED: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

function Badge({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-500">—</span>;
  const cls = VERDICT_STYLES[value] ?? "bg-slate-700 text-slate-200 border-slate-600";
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}

function recommend(r: InspectRow): string[] {
  const recs: string[] = [];
  if (r.error) recs.push("Erro na consulta GSC — verifique conexão.");
  if (r.coverageState && !/Submitted and indexed|indexed/i.test(r.coverageState)) {
    recs.push(`Cobertura: "${r.coverageState}". Solicite indexação manual no GSC.`);
  }
  if (r.robotsTxtState && r.robotsTxtState !== "ALLOWED") {
    recs.push(`robots.txt: ${r.robotsTxtState}. Libere o crawler.`);
  }
  if (r.pageFetchState && r.pageFetchState !== "SUCCESSFUL") {
    recs.push(`Fetch: ${r.pageFetchState}. Verifique se a URL responde 200.`);
  }
  if (r.mobileVerdict && r.mobileVerdict !== "PASS") {
    recs.push("Mobile: falha de usabilidade — teste viewport/tap targets.");
  }
  if (!r.lastCrawlTime) recs.push("Nunca foi rastreada — construa backlinks e submeta no GSC.");
  return recs;
}

function SeoDashboard() {
  const router = useRouter();
  const fetchFn = useServerFn(inspectAllRoutes);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["gsc-inspect"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const rows = data?.rows ?? [];
  const summary = {
    total: rows.length,
    pass: rows.filter((r) => r.verdict === "PASS").length,
    partial: rows.filter((r) => r.verdict === "PARTIAL").length,
    fail: rows.filter((r) => r.verdict === "FAIL" || r.error).length,
    neutral: rows.filter((r) => !r.verdict || r.verdict === "NEUTRAL" || r.verdict === "VERDICT_UNSPECIFIED").length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SEO Dashboard — Google Search Console</h1>
            <p className="text-sm text-slate-400">
              {data ? `Atualizado ${new Date(data.fetchedAt).toLocaleString("pt-BR")}` : "Carregando..."}
            </p>
          </div>
          <button
            onClick={() => router.invalidate()}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
            disabled={isFetching}
          >
            {isFetching ? "Atualizando..." : "Atualizar"}
          </button>
        </header>

        {error && <div className="p-4 rounded bg-red-500/10 border border-red-500/40 text-red-300">{(error as Error).message}</div>}

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: summary.total, cls: "text-slate-200" },
            { label: "PASS", value: summary.pass, cls: "text-emerald-300" },
            { label: "PARTIAL", value: summary.partial, cls: "text-amber-300" },
            { label: "FAIL", value: summary.fail, cls: "text-red-300" },
            { label: "Neutro", value: summary.neutral, cls: "text-slate-400" },
          ].map((c) => (
            <div key={c.label} className="rounded border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs uppercase text-slate-500">{c.label}</div>
              <div className={`text-2xl font-bold ${c.cls}`}>{c.value}</div>
            </div>
          ))}
        </section>

        <section className="rounded border border-slate-800 bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 text-slate-400 text-left">
              <tr>
                <th className="px-3 py-2">Rota</th>
                <th className="px-3 py-2">Verdict</th>
                <th className="px-3 py-2">Cobertura</th>
                <th className="px-3 py-2">Indexação</th>
                <th className="px-3 py-2">Robots</th>
                <th className="px-3 py-2">Fetch</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">Último crawl</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Consultando GSC...</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.path} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-mono">{r.path}</td>
                  <td className="px-3 py-2"><Badge value={r.verdict} /></td>
                  <td className="px-3 py-2 text-slate-300">{r.coverageState ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-300">{r.indexingState ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-300">{r.robotsTxtState ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-300">{r.pageFetchState ?? "—"}</td>
                  <td className="px-3 py-2"><Badge value={r.mobileVerdict} /></td>
                  <td className="px-3 py-2 text-slate-400 text-xs">
                    {r.lastCrawlTime ? new Date(r.lastCrawlTime).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Falhas & Recomendações</h2>
          {rows.map((r) => {
            const recs = recommend(r);
            if (!recs.length) return null;
            return (
              <div key={r.path} className="rounded border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm">{r.path}</span>
                  <Badge value={r.verdict} />
                </div>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                  {recs.map((rec, i) => <li key={i}>{rec}</li>)}
                </ul>
                {r.error && <pre className="mt-2 text-xs text-red-300 whitespace-pre-wrap">{r.error}</pre>}
              </div>
            );
          })}
          {rows.length > 0 && rows.every((r) => recommend(r).length === 0) && (
            <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-300">
              Nenhuma falha detectada. 🎉
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
