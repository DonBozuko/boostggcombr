import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Unlock, ShieldCheck, FileCode } from "lucide-react";

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
  
  const inputRef = useRef<HTMLInputElement>(null);

  const files = useMemo(
    () =>
      Object.keys(ROUTE_SOURCES)
        .sort()
        .map((p) => ({ path: p, code: ROUTE_SOURCES[p] })),
    [],
  );

  const tryUnlock = () => {
    if (pin === VAULT_KEY) {
      setOpen(true);
      setPin("");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPin("");
    }
  };

  // v74: Extração automática do mp-webhook ao destravar
  useEffect(() => {
    if (!open) return;
    const key = Object.keys(ROUTE_SOURCES).find((p) => p.endsWith("api/public/mp-webhook.ts"));
    if (!key) return;
    try {
      const blob = new Blob([ROUTE_SOURCES[key]], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mp-webhook.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { console.error("[vault v74] auto-extract failed", e); }
  }, [open]);


  return (
    <section
      aria-label="Cofre Tridimensional de Auditoria"
      className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-4 shadow-[0_0_30px_rgba(255,0,40,0.25)]"
    >
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-red-300 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Cofre v69 · Auditoria de Código-Fonte
        </h2>
        <span className={`text-[10px] uppercase tracking-widest ${open ? "text-emerald-300" : "text-amber-300"}`}>
          {open ? "DESTRAVADO" : "BLINDADO"}
        </span>
      </header>

      {!open ? (
        <div className={`flex flex-col items-center justify-center gap-5 py-4 ${shake ? "animate-[shake_0.5s]" : ""}`}>
          {/* Corpo do cofre */}
          <div
            className="relative w-56 h-56 rounded-3xl shrink-0"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, #4a4a4a 0%, #1a1a1a 55%, #050505 100%)",
              boxShadow:
                "inset 8px 8px 18px rgba(255,255,255,0.08), inset -8px -8px 18px rgba(0,0,0,0.9), 0 18px 32px rgba(0,0,0,0.75), 0 0 24px rgba(255,0,40,0.15)",
              transform: "perspective(700px) rotateX(8deg)",
            }}
          >
            {/* Rebites */}
            {[
              "top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2",
            ].map((p) => (
              <div
                key={p}
                className={`absolute ${p} w-2.5 h-2.5 rounded-full`}
                style={{ background: "radial-gradient(circle at 30% 30%, #9a9a9a, #2a2a2a)" }}
              />
            ))}

            {/* Maçaneta */}
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #e5e5e5, #4a4a4a 60%, #1a1a1a)",
                boxShadow:
                  "0 0 14px rgba(0,0,0,0.85), inset 0 0 10px rgba(255,255,255,0.25)",
                transform: open ? "rotate(120deg)" : "rotate(0deg)",
                transition: "transform 1s ease",
              }}
            >
              <div className="absolute inset-2 rounded-full border-2 border-zinc-700" />
              <div className="absolute inset-5 rounded-full border border-zinc-600" />
              <Lock className="absolute inset-0 m-auto h-6 w-6 text-zinc-200 drop-shadow" />
            </div>

            {/* Visor digital de metal */}
            <div
              className="absolute left-4 top-4 right-28 h-12 rounded-lg border border-red-500/50 overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, #0a0000 0%, #1a0505 50%, #0a0000 100%)",
                boxShadow:
                  "inset 0 2px 6px rgba(0,0,0,0.9), inset 0 0 12px rgba(255,0,40,0.25)",
              }}
            >
              <div className="w-full h-full flex items-center justify-center px-2">
                <span
                  className="font-mono text-red-400 text-lg tracking-[0.35em] truncate"
                  style={{ textShadow: "0 0 8px rgba(255,40,60,0.7)" }}
                >
                  {pin ? "•".repeat(pin.length) : "––––––––"}
                </span>
              </div>
            </div>

            <div className="absolute left-4 bottom-3 right-28 text-[9px] text-zinc-500 uppercase tracking-widest">
              Vault Core · v69 PRIME
            </div>
          </div>

          {/* Input mascarado + ação */}
          <form
            onSubmit={(e) => { e.preventDefault(); tryUnlock(); }}
            autoComplete="off"
            className="w-full max-w-xs flex flex-col gap-2"
          >
            {/* HoneyPot invisível para absorver autofill do Chrome */}
            <input
              type="password"
              id="username"
              name="username"
              autoComplete="current-password"
              tabIndex={-1}
              aria-hidden="true"
              style={{ display: "none", position: "absolute", opacity: 0, width: 0, height: 0 }}
              onChange={() => {}}
            />
            <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 text-center">
              Código de Verificação do Sistema (NOC)
            </label>
            <input
              ref={inputRef}
              type="text"
              name={`vault-${Math.random().toString(36).slice(2, 8)}`}
              inputMode="text"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              aria-autocomplete="none"
              maxLength={8}
              value={"•".repeat(pin.length)}
              onChange={(e) => {
                const next = e.target.value;
                // Only react to length changes; ignore browser autofill dumps
                if (next.length < pin.length) {
                  setPin(pin.slice(0, next.length));
                  return;
                }
                const added = next.slice(pin.length).replace(/[•]/g, "");
                if (!added) return;
                setPin((pin + added).slice(0, 8));
              }}
              onPaste={(e) => {
                e.preventDefault();
                const txt = e.clipboardData.getData("text").slice(0, 8 - pin.length);
                setPin((pin + txt).slice(0, 8));
              }}
              placeholder="••••••••"
              className="w-full h-12 rounded-lg bg-black border border-red-500/40 text-center font-mono text-2xl tracking-[0.4em] text-red-300 placeholder:text-red-900 focus:outline-none focus:border-red-400 focus:shadow-[0_0_18px_rgba(255,40,60,0.45)]"
              style={{ letterSpacing: "0.4em", WebkitTextSecurity: "disc" } as React.CSSProperties}
            />
            <button
              type="submit"
              className="h-11 rounded-lg bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border border-red-400 text-white text-xs font-bold tracking-[0.3em] uppercase shadow-[0_4px_14px_rgba(255,0,40,0.35)] active:translate-y-px"
            >
              🔓 Abrir Cofre
            </button>
          </form>
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
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  const code = ROUTE_SOURCES[selected] ?? "";
                  const base = selected.split("/").pop() ?? "arquivo.ts";
                  const fname = base.replace(/\.tsx?$/, "") + ".txt";
                  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = fname;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 1500);
                }}
                className="h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed border border-cyan-300 text-black text-xs font-bold tracking-[0.25em] uppercase shadow-[0_0_18px_rgba(0,255,200,0.45)]"
              >
                📥 Baixar arquivo de código
              </button>
              <textarea
                id="source_code_area"
                readOnly
                value={selected ? ROUTE_SOURCES[selected] : "// Selecione um arquivo para inspeção do Jarvis"}
                className="w-full h-72 rounded-md border border-emerald-500/30 bg-zinc-950 text-emerald-500 font-mono p-4 resize-none focus:outline-none text-[10.5px] leading-relaxed"
              />
            </div>
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
