import { useState } from "react";
import { SandboxModeToggle } from "@/components/SandboxModeToggle";
import { SimulateCheckoutPanel } from "@/components/SimulateCheckoutPanel";

/**
 * Laboratório: unifica Modo Teste (Sandbox) + Simulador de Compra
 * numa mesma seção com abas. São ferramentas diferentes:
 *  - Sandbox: zera saldo dos fornecedores pra testar recarga manual + PIX Telegram.
 *  - Simulador: dry-run puro do pipeline (pricing → routing → margem), sem tocar em nada.
 */
export function LaboratorioPanel({ token }: { token: string }) {
  const [tab, setTab] = useState<"sandbox" | "simulador">("simulador");

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
          🧪 Laboratório
        </div>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setTab("simulador")}
            className={`px-3 py-1 text-xs rounded-md transition ${
              tab === "simulador"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "text-white/60 hover:text-white/90"
            }`}
          >
            Simulador (dry-run)
          </button>
          <button
            onClick={() => setTab("sandbox")}
            className={`px-3 py-1 text-xs rounded-md transition ${
              tab === "sandbox"
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                : "text-white/60 hover:text-white/90"
            }`}
          >
            Modo Teste (zera saldo)
          </button>
        </div>
      </div>

      <div className="p-3 text-[11px] text-white/50 border-b border-white/5">
        {tab === "simulador"
          ? "Roda o pipeline inteiro (pricing → routing → margem → Telegram) SEM criar pedido, SEM debitar saldo, SEM chamar fornecedor. Use pra validar lógica de roteamento e margem."
          : "Zera o saldo de todos fornecedores no banco (guarda backup). Pedido real cai em waiting_provision e o Telegram alerta o PIX. Use pra validar o fluxo de recarga manual. Painel do fornecedor NÃO é tocado."}
      </div>

      <div className="p-3">
        <div className={tab === "sandbox" ? "block" : "hidden"}>
          <SandboxModeToggle />
        </div>
        <div className={tab === "simulador" ? "block" : "hidden"}>
          <SimulateCheckoutPanel token={token} />
        </div>
      </div>
    </div>
  );
}
