import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAutonomiaFlags, setAutonomiaFlag, type AutonomiaFlag } from "@/lib/autonomia-flags.functions";

/** v392 — Escada de Autonomia: o que o sistema pode consertar sozinho. */
export function AutonomiaPanel() {
  const [flags, setFlags] = useState<AutonomiaFlag[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useServerFn(getAutonomiaFlags);
  const save = useServerFn(setAutonomiaFlag);

  const refresh = async () => {
    try {
      const r = await load();
      setFlags(r.flags);
    } catch {
      setFlags([]);
    }
  };
  useEffect(() => { refresh(); }, []);

  const toggle = async (f: AutonomiaFlag) => {
    if (!f.pronto) return;
    if (!confirm(f.ligada ? `Desligar: ${f.nome}?` : `Ligar: ${f.nome}?\n\nTeto: ${f.teto ?? "sem teto"}\nVolta atrás: ${f.rollback}`)) return;
    setBusy(f.key);
    try {
      await save({ data: { key: f.key, enable: !f.ligada } });
      toast.success(f.ligada ? "Automação desligada" : "Automação ligada");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou");
    } finally { setBusy(null); }
  };

  return (
    <div className="rounded-xl border border-slate-600/50 bg-slate-950/40 p-3 backdrop-blur-xl">
      <div className="text-sm font-bold uppercase tracking-wider text-slate-300">🪜 Escada de Autonomia</div>
      <div className="mt-1 text-xs text-white/60">
        Nível 1 conserta sozinho sempre. Abaixo, o que precisa da sua permissão.
      </div>
      <ul className="mt-3 space-y-2">
        {flags.map((f) => (
          <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
            <div className="min-w-0">
              <div className="text-sm text-white/90">
                <span className="mr-1 rounded bg-white/10 px-1 text-[10px]">nível {f.nivel}</span>
                {f.nome}
              </div>
              <div className="text-[11px] text-white/50">
                {f.pronto ? (f.teto ? `Teto: ${f.teto}` : "Sem teto declarado") : "Sem executor — só alerta hoje"}
              </div>
            </div>
            <Button
              size="sm"
              variant={f.ligada ? "destructive" : "outline"}
              disabled={!f.pronto || busy === f.key}
              onClick={() => toggle(f)}
            >
              {busy === f.key ? "..." : f.ligada ? "Desligar" : f.pronto ? "Ligar" : "Indisponível"}
            </Button>
          </li>
        ))}
        {flags.length === 0 && <li className="text-xs text-white/50">Sem automações declaradas.</li>}
      </ul>
    </div>
  );
}
