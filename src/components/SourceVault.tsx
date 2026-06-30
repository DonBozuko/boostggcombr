import { useMemo, useState } from "react";
import { Lock, Unlock, ShieldCheck, FileCode } from "lucide-react";

// Carrega o código-fonte bruto de todas as rotas em build-time (Vite).
const ROUTE_SOURCES = import.meta.glob("/src/routes/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const VAULT_KEY = "F@bi1313";

export function SourceVault() {
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const files = useMemo(
    () =>
      Object.keys(ROUTE_SOURCES)
        .sort()
        .map((p) => ({ path: p, code: ROUTE_SOURCES[p] })),
    [],
  );

  const press = (k: string) => {
    if (open) return;
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    if (k === "OK") {
      if (pin === VAULT_KEY) {
        setOpen(true);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPin("");
      }
      return;
    }
    if (pin.length >= 12) return;
    setPin((p) => p + k);
  };

  const [mode, setMode] = useState<"ABC" | "123" | "SYM">("ABC");
  const keys =
    mode === "123"
      ? ["1","2","3","4","5","6","7","8","9","0"]
      : mode === "SYM"
      ? ["@","#","$","%","&","*","!","?",".","_","-","+"]
      : ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

  return (
    <section
      aria-label="Cofre Tridimensional de Auditoria"
      className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-4 shadow-[0_0_30px_rgba(255,0,40,0.25)]"
    >
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-red-300 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Cofre v68 · Auditoria de Código-Fonte
        </h2>
        <span className={`text-[10px] uppercase tracking-widest ${open ? "text-emerald-300" : "text-amber-300"}`}>
          {open ? "DESTRAVADO" : "BLINDADO"}
        </span>
      </header>

      {!open ? (
        <div className={`flex flex-col sm:flex-row gap-4 items-center justify-center ${shake ? "animate-[shake_0.5s]" : ""}`}>
          {/* Corpo do cofre */}
          <div
            className="relative w-44 h-44 rounded-2xl shrink-0"
            style={{
              background: "linear-gradient(145deg,#3a3a3a,#0a0a0a)",
              boxShadow:
                "inset 6px 6px 14px rgba(255,255,255,0.08), inset -6px -6px 14px rgba(0,0,0,0.85), 0 12px 24px rgba(0,0,0,0.7)",
              transform: "perspective(600px) rotateX(6deg)",
            }}
          >
            {/* Maçaneta */}
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
              style={{
                background: "radial-gradient(circle at 30% 30%, #d4d4d4, #4a4a4a 60%, #1a1a1a)",
                boxShadow: "0 0 12px rgba(0,0,0,0.8), inset 0 0 8px rgba(255,255,255,0.2)",
                transform: open ? "rotate(120deg)" : "rotate(0deg)",
                transition: "transform 1s ease",
              }}
            >
              <div className="absolute inset-2 rounded-full border-2 border-zinc-700" />
              <Lock className="absolute inset-0 m-auto h-5 w-5 text-zinc-300" />
            </div>
            {/* Display */}
            <div className="absolute left-3 top-3 right-24 h-10 rounded-md bg-black border border-red-500/40 flex items-center px-2 font-mono text-red-400 text-sm tracking-[0.3em] shadow-inner">
              {pin.replace(/./g, "•") || "----"}
            </div>
            <div className="absolute left-3 bottom-3 right-24 text-[9px] text-zinc-500 uppercase tracking-widest">
              Vault Core · v68
            </div>
          </div>

          {/* Teclado alfanumérico */}
          <div className="flex flex-col gap-1.5 w-full sm:w-72">
            <div className="grid grid-cols-3 gap-1.5">
              {(["ABC","123","SYM"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`h-7 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                    mode === m
                      ? "bg-red-700 border-red-400 text-white"
                      : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >{m === "ABC" ? "A-Z" : m === "123" ? "1-2-3" : "#@$"}</button>
              ))}
            </div>
            <div className={`grid gap-1 ${mode === "ABC" ? "grid-cols-7" : "grid-cols-5"}`}>
              {keys.map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className="h-9 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 font-mono text-xs shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)] active:translate-y-px"
                >
                  {mode === "ABC" ? k.toLowerCase() : k}
                </button>
              ))}
              {mode === "ABC" && (
                <button
                  key="shift-upper"
                  onClick={() => {
                    // alterna maiúsculas inserindo última como upper — atalho: pressionar SHIFT troca próxima
                  }}
                  className="hidden"
                  aria-hidden
                />
              )}
            </div>
            {mode === "ABC" && (
              <div className="grid grid-cols-7 gap-1">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((k) => (
                  <button
                    key={"U"+k}
                    onClick={() => press(k)}
                    className="h-9 rounded-md bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 text-amber-200 font-mono text-xs font-bold shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)] active:translate-y-px"
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => press("⌫")}
                className="h-10 rounded-md bg-amber-900/40 border border-amber-500/40 text-amber-200 text-xs font-bold"
              >⌫</button>
              <button
                onClick={() => press("OK")}
                className="h-10 col-span-2 rounded-md bg-red-700 hover:bg-red-600 border border-red-400 text-white text-xs font-bold tracking-widest"
              >ABRIR</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-emerald-300 text-xs">
            <Unlock className="h-4 w-4" /> Cofre aberto · {files.length} arquivos de rota disponíveis para Jarvis.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3">
            <div className="rounded-md border border-emerald-500/30 bg-black/60 max-h-72 overflow-y-auto">
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setSelected(f.path)}
                  className={`w-full text-left px-2 py-1.5 text-[11px] font-mono border-b border-white/5 flex items-center gap-1.5 hover:bg-emerald-900/20 ${
                    selected === f.path ? "bg-emerald-900/30 text-emerald-200" : "text-zinc-300"
                  }`}
                >
                  <FileCode className="h-3 w-3 opacity-60" />
                  {f.path.replace("/src/routes/", "")}
                </button>
              ))}
            </div>
            <pre className="rounded-md border border-emerald-500/30 bg-black/80 p-3 max-h-72 overflow-auto text-[10.5px] leading-relaxed text-emerald-100 font-mono whitespace-pre-wrap break-all">
              {selected ? ROUTE_SOURCES[selected] : "// Selecione um arquivo para inspeção do Jarvis"}
            </pre>
          </div>
          <button
            onClick={() => { setOpen(false); setPin(""); setSelected(null); }}
            className="text-[10px] uppercase tracking-widest text-red-300 hover:text-red-200"
          >🔒 Re-trancar cofre</button>
        </div>
      )}

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      `}</style>
    </section>
  );
}
