import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Menu,
  Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico — Conexão Supabase" },
      { name: "description", content: "Painel diagnóstico de conexão e estrutura do banco de dados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticoPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-xl font-semibold">Erro no painel</h1>
      <pre className="mt-2 text-rose-500 text-sm whitespace-pre-wrap">{error.message}</pre>
      <Button onClick={reset} className="mt-4">Tentar novamente</Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-slate-900 text-white p-6">Não encontrado</div>
  ),
});

type PingState = { status: "idle" | "loading" | "ok" | "error"; ms?: number; error?: string };
type SchemaRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  constraint_type: string | null;
};

function DiagnosticoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ping, setPing] = useState<PingState>({ status: "idle" });
  const [schema, setSchema] = useState<SchemaRow[] | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [writeState, setWriteState] = useState<{ loading: boolean; ms?: number; error?: string; id?: string }>({ loading: false });
  const [readState, setReadState] = useState<{ loading: boolean; ms?: number; error?: string; row?: any }>({ loading: false });

  async function runPing() {
    setPing({ status: "loading" });
    const t0 = performance.now();
    try {
      const { error } = await supabase.from("connection_tests").select("id", { head: true, count: "exact" }).limit(1);
      const ms = Math.round(performance.now() - t0);
      if (error) throw error;
      setPing({ status: "ok", ms });
    } catch (e: any) {
      setPing({ status: "error", error: e?.message ?? String(e), ms: Math.round(performance.now() - t0) });
    }
  }

  async function loadSchema() {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const { data, error } = await supabase.rpc("get_public_schema");
      if (error) throw error;
      setSchema((data ?? []) as SchemaRow[]);
    } catch (e: any) {
      setSchemaError(e?.message ?? String(e));
    } finally {
      setSchemaLoading(false);
    }
  }

  async function writeTest() {
    setWriteState({ loading: true });
    const t0 = performance.now();
    try {
      const { data, error } = await supabase
        .from("connection_tests")
        .insert({ status: "ok" })
        .select()
        .single();
      const ms = Math.round(performance.now() - t0);
      if (error) throw error;
      setWriteState({ loading: false, ms, id: data?.id });
    } catch (e: any) {
      setWriteState({ loading: false, error: e?.message ?? String(e), ms: Math.round(performance.now() - t0) });
    }
  }

  async function readTest() {
    setReadState({ loading: true });
    const t0 = performance.now();
    try {
      const { data, error } = await supabase
        .from("connection_tests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const ms = Math.round(performance.now() - t0);
      if (error) throw error;
      setReadState({ loading: false, ms, row: data });
    } catch (e: any) {
      setReadState({ loading: false, error: e?.message ?? String(e), ms: Math.round(performance.now() - t0) });
    }
  }

  useEffect(() => {
    runPing();
    loadSchema();
  }, []);

  const tablesGrouped = schema
    ? Object.entries(
        schema.reduce<Record<string, SchemaRow[]>>((acc, row) => {
          (acc[row.table_name] ||= []).push(row);
          return acc;
        }, {}),
      )
    : [];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-slate-950 border-r border-slate-800 transition-all duration-200 flex flex-col",
          sidebarOpen ? "w-60" : "w-14",
        )}
      >
        <div className="h-14 flex items-center px-3 border-b border-slate-800">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded hover:bg-slate-800"
            aria-label="Alternar menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {sidebarOpen && <span className="ml-2 font-semibold">Diagnóstico</span>}
        </div>
        <nav className="flex-1 p-2 space-y-1 text-sm">
          <SidebarItem icon={<Activity className="h-4 w-4" />} label="Conexão" open={sidebarOpen} href="#conexao" />
          <SidebarItem icon={<Database className="h-4 w-4" />} label="Tabelas" open={sidebarOpen} href="#tabelas" />
          <SidebarItem icon={<PlayCircle className="h-4 w-4" />} label="Leitura/Escrita" open={sidebarOpen} href="#io" />
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-800 text-slate-300">
            <Home className="h-4 w-4" />
            {sidebarOpen && <span>Voltar ao site</span>}
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 space-y-8 overflow-x-hidden">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Painel de Diagnóstico</h1>
          <p className="text-slate-400 text-sm mt-1">Conexão, esquema e testes de leitura/escrita do banco.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status Conexão */}
          <section id="conexao" className="bg-slate-800/50 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Status Conexão</h2>
              <Button size="sm" variant="secondary" onClick={runPing} disabled={ping.status === "loading"}>
                {ping.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar Ping"}
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              {ping.status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
              {ping.status === "ok" && (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Conectado</span>
                  <span className="text-slate-400 text-sm">({ping.ms} ms)</span>
                </>
              )}
              {ping.status === "error" && (
                <>
                  <XCircle className="h-6 w-6 text-rose-500" />
                  <span className="text-rose-500 font-medium">Falha</span>
                </>
              )}
              {ping.status === "idle" && <span className="text-slate-400">Aguardando…</span>}
            </div>
            {ping.status === "error" && (
              <pre className="mt-3 text-xs bg-slate-950 border border-rose-500/30 text-rose-400 rounded p-3 overflow-auto whitespace-pre-wrap">
                {ping.error}
              </pre>
            )}
          </section>

          {/* IO */}
          <section id="io" className="bg-slate-800/50 border border-slate-800 rounded-lg p-5">
            <h2 className="text-lg font-semibold">Teste Leitura/Escrita</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={writeTest} disabled={writeState.loading}>
                {writeState.loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Gravar Registro Teste
              </Button>
              <Button variant="secondary" onClick={readTest} disabled={readState.loading}>
                {readState.loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Ler Registro Teste
              </Button>
            </div>
            <ResultBlock title="Escrita" state={writeState} extra={writeState.id ? `id: ${writeState.id}` : undefined} />
            <ResultBlock
              title="Leitura"
              state={readState}
              extra={readState.row ? JSON.stringify(readState.row, null, 2) : undefined}
            />
          </section>
        </div>

        {/* Tabelas */}
        <section id="tabelas" className="bg-slate-800/50 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Estrutura de Tabelas</h2>
            <Button size="sm" variant="secondary" onClick={loadSchema} disabled={schemaLoading}>
              {schemaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recarregar"}
            </Button>
          </div>

          {schemaError && (
            <pre className="mt-3 text-xs bg-slate-950 border border-rose-500/30 text-rose-400 rounded p-3 overflow-auto whitespace-pre-wrap">
              {schemaError}
            </pre>
          )}

          {schemaLoading && (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-6 w-1/3 bg-slate-700" />
              <Skeleton className="h-24 w-full bg-slate-700" />
            </div>
          )}

          {!schemaLoading && tablesGrouped.length === 0 && !schemaError && (
            <p className="mt-4 text-slate-400 text-sm">Nenhuma tabela encontrada.</p>
          )}

          <div className="mt-4 space-y-6">
            {tablesGrouped.map(([tableName, cols]) => (
              <div key={tableName}>
                <h3 className="font-mono text-emerald-400 text-sm mb-2">{tableName}</h3>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-950 hover:bg-slate-950 border-slate-800">
                        <TableHead className="text-slate-300">Coluna</TableHead>
                        <TableHead className="text-slate-300">Tipo</TableHead>
                        <TableHead className="text-slate-300">Nulo?</TableHead>
                        <TableHead className="text-slate-300">Default</TableHead>
                        <TableHead className="text-slate-300">Restrições</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cols.map((c) => (
                        <TableRow key={c.column_name} className="border-slate-800 hover:bg-slate-800/60">
                          <TableCell className="font-mono text-white">{c.column_name}</TableCell>
                          <TableCell className="text-slate-300">{c.data_type}</TableCell>
                          <TableCell className="text-slate-400">{c.is_nullable}</TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs">{c.column_default ?? "—"}</TableCell>
                          <TableCell className={cn("text-xs", c.constraint_type ? "text-emerald-400" : "text-slate-500")}>
                            {c.constraint_type ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, open, href }: { icon: React.ReactNode; label: string; open: boolean; href: string }) {
  return (
    <a href={href} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-800 text-slate-300">
      {icon}
      {open && <span>{label}</span>}
    </a>
  );
}

function ResultBlock({
  title,
  state,
  extra,
}: {
  title: string;
  state: { loading: boolean; ms?: number; error?: string };
  extra?: string;
}) {
  if (state.loading) {
    return <Skeleton className="mt-3 h-12 w-full bg-slate-700" />;
  }
  if (!state.ms && !state.error) return null;
  return (
    <div className="mt-3 text-sm">
      <div className="flex items-center gap-2">
        {state.error ? (
          <XCircle className="h-4 w-4 text-rose-500" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        )}
        <span className={state.error ? "text-rose-500" : "text-emerald-400"}>{title}</span>
        {state.ms != null && <span className="text-slate-400">({state.ms} ms)</span>}
      </div>
      {state.error && (
        <pre className="mt-2 text-xs bg-slate-950 border border-rose-500/30 text-rose-400 rounded p-3 overflow-auto whitespace-pre-wrap">
          {state.error}
        </pre>
      )}
      {extra && !state.error && (
        <pre className="mt-2 text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded p-3 overflow-auto whitespace-pre-wrap">
          {extra}
        </pre>
      )}
    </div>
  );
}
