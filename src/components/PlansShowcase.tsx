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

export function ShowcaseTrigger({ label = "VER TODOS OS PLANOS" }: { label?: string }) {
  const { setOpen, accent } = useShowcase();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="px-3 py-1.5 rounded-md text-[11px] font-black tracking-wider uppercase border-2 transition-all hover:scale-105 active:scale-95"
      style={{
        color: accent,
        borderColor: accent,
        background: `${accent}10`,
        boxShadow: `0 0 12px ${accent}55, inset 0 0 8px ${accent}22`,
        textShadow: `0 0 6px ${accent}88`,
      }}
    >
      {label}
    </button>
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
