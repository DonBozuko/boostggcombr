import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSandboxEnabled, toggleSandboxAllProviders } from "@/lib/sandbox.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SandboxModeToggle() {
  const [enabled, setEnabled] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const getState = useServerFn(getSandboxEnabled);
  const toggle = useServerFn(toggleSandboxAllProviders);

  const refresh = async () => {
    const r = await getState();
    setEnabled(r.enabled);
    setProviders((r as any).fornecedores ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const handleToggle = async () => {
    if (!confirm(enabled
      ? "Restaurar saldo REAL de todos fornecedores?"
      : "ATIVAR MODO TESTE: zerar saldo de TODOS fornecedores (guardando backup)?\n\nO cliente NÃO percebe — pedidos entram em waiting_provision e o Telegram te alerta. Painéis reais NÃO são tocados."
    )) return;
    setLoading(true);
    try {
      await toggle({ data: { enable: !enabled } });
      toast.success(enabled ? "✅ Saldos restaurados" : "🧪 Modo Teste ativado — saldos zerados no banco (painéis reais intactos)");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou");
    } finally { setLoading(false); }
  };

  return (
    <div className={`rounded-xl border-2 p-3 backdrop-blur-xl ${
      enabled
        ? "border-yellow-500 bg-yellow-950/50 shadow-[0_0_24px_rgba(250,204,21,0.5)] animate-pulse"
        : "border-slate-600/50 bg-slate-950/40"
    }`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className={`font-bold text-sm uppercase tracking-wider ${enabled ? "text-yellow-300" : "text-slate-300"}`}>
            🧪 {enabled ? "MODO TESTE ATIVO" : "Modo Teste (Sandbox)"}
          </div>
          <div className="text-xs text-white/70 mt-1">
            {enabled
              ? "Saldos zerados no banco. Fluxo waiting_provision + Telegram PIX está sendo simulado. Painéis reais dos fornecedores permanecem intactos."
              : "Zera saldo de todos fornecedores em 1 clique para testar o fluxo de recarga manual. Cliente não percebe."}
          </div>
          {providers.length > 0 && (
            <ul className="mt-2 text-[11px] font-mono text-white/60 space-y-0.5">
              {providers.map((p: any) => (
                <li key={p.slug}>
                  • {p.nome}: saldo <b className={Number(p.saldo_atual) === 0 ? "text-red-400" : "text-emerald-400"}>R$ {Number(p.saldo_atual).toFixed(2)}</b>
                  {p.saldo_atual_backup != null && <span className="text-yellow-400"> (backup: R$ {Number(p.saldo_atual_backup).toFixed(2)})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          size="sm"
          variant={enabled ? "destructive" : "outline"}
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? "..." : enabled ? "🔓 Restaurar saldos reais" : "🧪 Ativar Modo Teste"}
        </Button>
      </div>
    </div>
  );
}
