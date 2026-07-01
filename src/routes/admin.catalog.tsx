import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PricingCatalogEditor } from "@/components/PricingCatalogEditor";

export const Route = createFileRoute("/admin/catalog")({
  head: () => ({
    meta: [
      { title: "Catálogo · EliteBoost Prime Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCatalogPage,
});

const ADMIN_TOKEN_KEY = "eliteboost_prime_admin_token";

function AdminCatalogPage() {
  const [token, setToken] = useState<string>("");
  const [input, setInput] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
    setToken(t);
    setInput(t);
  }, []);

  const save = () => {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, input);
    setToken(input);
  };

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
