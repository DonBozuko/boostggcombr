import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id");
    if (!authorizationId) throw new Error("Missing authorization_id");
    // @ts-ignore - Supabase oauth namespace is beta
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    if (!data) throw new Error("Authorization details unavailable");
    if ("redirect_url" in data) throw redirect({ href: data.redirect_url });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-8 text-center shadow-2xl">
        <h1 className="text-xl font-bold text-red-500">Erro na Autorização</h1>
        <p className="mt-4 text-gray-400">{String((error as Error)?.message ?? error)}</p>
        <button 
          onClick={() => window.location.href = "/"}
          className="mt-6 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
        >
          Voltar para Home
        </button>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    // @ts-ignore
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    
    if (error) { setBusy(false); setError(error.message); return; }
    // @ts-ignore
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("Erro: Redirecionamento não retornado."); return; }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 font-sans text-white">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl">
        <div className="p-8">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
          </div>
          
          <h1 className="text-center text-2xl font-bold tracking-tight">
            Conectar {details?.client?.name ?? "Assistente AI"} à sua conta BoostGG
          </h1>
          
          <p className="mt-4 text-center text-gray-400">
            Isso permite que o assistente consulte o status dos seus pedidos e pacotes em seu nome.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/5 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Acesso solicitado</h2>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  Ver status de seus pedidos
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  Consultar preços da vitrine
                </li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button
              disabled={busy}
              onClick={() => decide(true)}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Processando..." : "Aprovar Acesso"}
            </button>
            <button
              disabled={busy}
              onClick={() => decide(false)}
              className="w-full rounded-xl bg-white/5 py-3 font-semibold text-gray-400 transition-all hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
        
        <div className="bg-white/[0.02] p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            Esta conexão não dá acesso à sua senha ou dados de pagamento.
          </p>
        </div>
      </div>
    </main>
  );
}
