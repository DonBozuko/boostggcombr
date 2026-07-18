import { createContext, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Ctx = { open: boolean; setOpen: (v: boolean) => void; accent: string };
const ShowcaseCtx = createContext<Ctx | null>(null);

export function PlansShowcaseProvider({ accent = "#FFD700", children }: { accent?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <ShowcaseCtx.Provider value={{ open, setOpen, accent }}>{children}</ShowcaseCtx.Provider>;
}

function useShowcase() {
  const ctx = useContext(ShowcaseCtx);
  if (!ctx) throw new Error("PlansShowcase missing provider");
  return ctx;
}

const SLOT_WORDS = ["VER", "TODOS", "OS", "PLANOS"];
const STEP_SECONDS = 1.4;

export function ShowcaseTrigger({ label }: { label?: string }) {
  const { setOpen, accent } = useShowcase();
  void label;
  const n = SLOT_WORDS.length;
  const total = (STEP_SECONDS * n).toFixed(2);
  const half = (100 / n).toFixed(2);
  return (
    <>
      <style>{`
        @keyframes slot-word-fade-${n} {
          ${SLOT_WORDS.map((_, i) => {
            const start = ((i / n) * 100).toFixed(2);
            const peak = (((i + 0.25) / n) * 100).toFixed(2);
            const end = (((i + 0.75) / n) * 100).toFixed(2);
            const next = (((i + 1) / n) * 100).toFixed(2);
            return `${start}% { opacity: 0; transform: translateY(8px) scale(0.92); }
${peak}% { opacity: 1; transform: translateY(0) scale(1); }
${end}% { opacity: 1; transform: translateY(0) scale(1); }
${next}% { opacity: 0; transform: translateY(-8px) scale(0.92); }`;
          }).join("\n")}
        }
        .slot-word-track {
          animation: slot-word-fade-${n} ${total}s ease-in-out infinite;
        }
        .slot-word-track:nth-child(1) { animation-delay: 0s; }
        .slot-word-track:nth-child(2) { animation-delay: -${(STEP_SECONDS * 1).toFixed(2)}s; }
        .slot-word-track:nth-child(3) { animation-delay: -${(STEP_SECONDS * 2).toFixed(2)}s; }
        .slot-word-track:nth-child(4) { animation-delay: -${(STEP_SECONDS * 3).toFixed(2)}s; }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver todos os planos"
        className="group relative h-9 px-4 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          border: `1px solid ${accent}`,
          background: `linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.95) 100%)`,
          boxShadow: `0 0 0 1px ${accent}22, 0 4px 14px ${accent}22, inset 0 1px 0 ${accent}15`,
        }}
      >
        <span className="relative flex items-center justify-center min-w-[92px] h-[20px]">
          {SLOT_WORDS.map((w) => (
            <span
              key={w}
              className="slot-word-track absolute inset-0 flex items-center justify-center text-[11px] font-bold tracking-[0.12em] uppercase whitespace-nowrap"
              style={{
                color: accent,
                textShadow: `0 0 8px ${accent}66`,
              }}
            >
              {w}
            </span>
          ))}
        </span>
        <span
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${accent}14 0%, transparent 70%)` }}
        />
      </button>
    </>
  );
}

export function ShowcaseShell({ children }: { children: ReactNode }) {
  const { open, setOpen, accent } = useShowcase();
  if (!open) return <>{children}</>;
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/40 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur-md">
        <span
          className="text-sm font-black tracking-widest uppercase"
          style={{ color: accent, textShadow: `0 0 8px ${accent}88` }}
        >
          ⚡ VITRINE COMPLETA DE PLANOS
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="h-8 w-8 p-0 text-white hover:bg-white/10"
          aria-label="Fechar"
        >
          <X className="size-5" />
        </Button>
      </div>
      <div className="px-3 py-4 max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
