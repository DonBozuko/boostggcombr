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

export function ShowcaseTrigger({ label }: { label?: string }) {
  const { setOpen, accent } = useShowcase();
  void label;
  const n = SLOT_WORDS.length;
  const stepDur = 1.7; // seconds per word
  const total = (stepDur * n).toFixed(2);
  return (
    <>
      <style>{`
        @keyframes vertical-carousel-3d-${n} {
          ${SLOT_WORDS.map((_, i) => {
            const startPct = ((i / n) * 100).toFixed(2);
            const holdPct = (((i + 0.82) / n) * 100).toFixed(2);
            const deg = -90 * i;
            return `${startPct}% { transform: rotateX(${deg}deg); } ${holdPct}% { transform: rotateX(${deg}deg); }`;
          }).join("\n")}
          100% { transform: rotateX(-360deg); }
        }
        .slot-3d-stage { perspective: 200px; }
        .slot-3d-ring {
          transform-style: preserve-3d;
          animation: vertical-carousel-3d-${n} ${total}s cubic-bezier(.7,.05,.3,1) infinite;
        }
        .slot-3d-face {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          backface-visibility: hidden;
        }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver todos os planos"
        className="relative w-[100px] h-[36px] rounded-md flex items-center justify-center overflow-hidden transition-transform hover:scale-105 active:scale-95"
        style={{
          border: `1px solid ${accent}`,
          background: "rgba(0,0,0,0.82)",
          boxShadow: `0 0 10px ${accent}55, inset 0 0 6px ${accent}22`,
        }}
      >
        <div className="slot-3d-stage absolute inset-0">
          <div className="slot-3d-ring relative w-full h-full">
            {SLOT_WORDS.map((w, i) => (
              <div
                key={w}
                className="slot-3d-face text-[12px] font-black tracking-wider uppercase"
                style={{
                  color: accent,
                  textShadow: `0 0 6px ${accent}aa`,
                  transform: `rotateX(${90 * i}deg) translateZ(18px)`,
                }}
              >
                {w}
              </div>
            ))}
          </div>
        </div>
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
