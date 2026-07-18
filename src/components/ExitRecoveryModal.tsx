// v190 — Modal de recuperação de checkout (exit intent).
// Estratégia: PRIME15 já aplicado automaticamente. Modal foca em derrubar OBJEÇÃO
// (segurança/entrega) e trazer o usuário de volta ao formulário, não em oferecer
// cupom extra que exigiria mudança no backend de pricing.
import { X, Shield, Zap, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export function ExitRecoveryModal({ open, onClose, onContinue }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-recovery-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-[#0b1220] to-[#111827] border border-white/10 shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-3 py-1 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Espera aí</span>
          </div>
          <h2 id="exit-recovery-title" className="text-white text-2xl font-extrabold leading-tight mb-2">
            Antes de sair — 3 coisas que você precisa saber
          </h2>
          <p className="text-white/70 text-sm">
            É seguro, rápido, e você já tem <span className="text-yellow-300 font-bold">15% OFF</span> aplicado no pedido.
          </p>
        </div>

        <ul className="space-y-3 mb-6">
          <li className="flex gap-3 items-start">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm">Nunca pedimos sua senha</p>
              <p className="text-white/60 text-xs">Só o @ público. Zero risco pra sua conta.</p>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <Zap className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm">Entrega em minutos após o Pix</p>
              <p className="text-white/60 text-xs">Fila automática, sem espera de atendimento.</p>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm">Garantia de reposição 30 dias</p>
              <p className="text-white/60 text-xs">Caiu seguidor? Repomos sem custo.</p>
            </div>
          </li>
        </ul>

        <button
          onClick={onContinue}
          className="w-full py-3.5 rounded-xl font-extrabold text-black text-base uppercase tracking-wide bg-gradient-to-r from-[#facc15] to-[#eab308] hover:brightness-110 transition shadow-[0_0_20px_rgba(234,179,8,0.4)]"
        >
          Continuar meu pedido
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-white/50 hover:text-white/80 text-xs transition"
        >
          Não, obrigado
        </button>
      </div>
    </div>
  );
}
