import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PricingCatalogEditor } from "@/components/PricingCatalogEditor";
import { getAdminTokenForSession } from "@/lib/admin-session.functions";

export const Route = createFileRoute("/admin/catalog")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Catálogo · Elite Boost Prime Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCatalogPage,
});

function AdminCatalogPage() {
  const [token, setToken] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const fetchAdminToken = useServerFn(getAdminTokenForSession);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetchAdminToken({ data: {} as never });
        if (alive && res.ok) setToken(res.token);
      } catch { /* sem sessão admin */ }
      if (alive) setChecked(true);
    })();
    return () => { alive = false; };
  }, [fetchAdminToken]);


  return (
    <div className="min-h-screen bg-black text-amber-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-amber-300">
            📦 CATÁLOGO · IDs DE FORNECEDORES
          </h1>
          <Link
            to="/admin"
            className="text-xs px-3 py-2 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
          >
            ← voltar ao painel
          </Link>
        </div>

        {!token ? (
          <div className="rounded-xl border border-amber-500/30 bg-black/60 p-4">
            <label className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-1 block">
              Token administrativo
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md bg-black/50 border border-amber-500/30 px-3 py-2 text-sm text-amber-100"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ADMIN_TOKEN"
                autoComplete="off"
              />
              <button
                onClick={save}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-black text-sm font-bold"
              >
                Entrar
              </button>
            </div>
          </div>
        ) : (
          <PricingCatalogEditor token={token} />
        )}
      </div>
    </div>
  );
}
