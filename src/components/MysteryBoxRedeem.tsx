// v115 — Mystery Box Redeem UI (One-Time Token Validator)
// Renderiza SOMENTE quando qty > 200 e pedido está pago.
// Trava resgate duplo via localStorage + cookie por pedidoId.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { redeemMysteryBox } from "@/lib/mystery-box.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const K = (pid: string) => `mb_redeemed_${pid}`;

function readFlag(pid: string): { redeemed: boolean; bonus?: number } {
  if (typeof window === "undefined") return { redeemed: false };
  try {
    const v = localStorage.getItem(K(pid));
    if (v) return { redeemed: true, bonus: Number(v) || undefined };
    const c = document.cookie.split("; ").find((r) => r.startsWith(`${K(pid)}=`));
    if (c) return { redeemed: true, bonus: Number(c.split("=")[1]) || undefined };
  } catch {}
  return { redeemed: false };
}

function writeFlag(pid: string, bonus: number) {
  try {
    localStorage.setItem(K(pid), String(bonus));
    document.cookie = `${K(pid)}=${bonus}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } catch {}
}

export function MysteryBoxRedeem({
  pedidoId,
  quantidade,
  unit = "seguidores",
  accent = "#FFD700",
}: {
  pedidoId: string | null;
  quantidade: number;
  unit?: string;
  accent?: string;
}) {
  const redeemFn = useServerFn(redeemMysteryBox);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [bonus, setBonus] = useState<number | null>(null);
  const [alreadyMsg, setAlreadyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!pedidoId) return;
    const f = readFlag(pedidoId);
    if (f.redeemed) {
      setAlreadyMsg("⚠️ Esta bonificação promocional já foi resgatada com sucesso para este pedido.");
      if (f.bonus) setBonus(f.bonus);
    }
  }, [pedidoId]);

  if (!pedidoId || quantidade <= 200) return null;

  const submit = async () => {
    if (!pedidoId) return;
    if (readFlag(pedidoId).redeemed) {
      setAlreadyMsg("⚠️ Esta bonificação promocional já foi resgatada com sucesso para este pedido.");
      return;
    }
    const h = handle.trim().replace(/^@+/, "");
    if (h.length < 2) { toast.error("Informe seu @ para receber o bônus."); return; }
    setLoading(true);
    try {
      const r = await redeemFn({ data: { pedidoId, handle: h } });
      if (r.ok) {
        writeFlag(pedidoId, r.bonus);
        setBonus(r.bonus);
        toast.success(`🎁 Você ganhou +${r.bonus} ${unit} extras!`);
      } else if (r.error === "JA_RESGATADO") {
        if ("bonus" in r && r.bonus) writeFlag(pedidoId, r.bonus as number);
        setAlreadyMsg("⚠️ Esta bonificação promocional já foi resgatada com sucesso para este pedido.");
      } else {
        toast.error("Não foi possível resgatar agora. Tente novamente.");
      }
    } catch {
      toast.error("Erro ao resgatar o bônus.");
    } finally {
      setLoading(false);
    }
  };

  if (bonus != null) {
    return (
      <div
        className="w-full rounded-xl p-4 text-center"
        style={{
          background: "linear-gradient(135deg,#4a044e 0%,#7c2d12 100%)",
          border: `2px solid ${accent}`,
          boxShadow: `0 0 22px ${accent}88`,
        }}
      >
        <div className="text-2xl mb-1">🎁✨</div>
        <p className="text-white font-black text-sm leading-tight">
          Você abriu a <span style={{ color: accent }}>Caixa Misteriosa</span> e ganhou
          <br />
          <span className="text-2xl" style={{ color: "#39ff14", textShadow: "0 0 10px #39ff14" }}>
            +{bonus} {unit.toUpperCase()} EXTRA
          </span>
          <br />
          Já enviamos para o seu perfil.
        </p>
        {alreadyMsg && (
          <p className="mt-2 text-[11px] font-bold text-amber-300">{alreadyMsg}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-xl p-4 space-y-3"
      style={{
        background: "linear-gradient(135deg, rgba(88,28,135,0.75) 0%, rgba(190,24,93,0.75) 100%)",
        border: `2px dashed ${accent}`,
        boxShadow: `0 0 22px ${accent}66`,
      }}
    >
      <div className="text-center">
        <div className="text-2xl">🎁</div>
        <p className="text-white font-black text-sm leading-tight">
          Abra a <span style={{ color: accent }}>Caixa Misteriosa</span>
          <br />
          <span className="text-white/90 text-[12px] font-bold">
            Insira seu @ e ganhe de 10 a 50 {unit} EXTRA
          </span>
        </p>
      </div>
      {alreadyMsg ? (
        <p className="text-center text-amber-300 font-bold text-sm">{alreadyMsg}</p>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="mb-handle" className="text-white/90 text-xs">Seu identificador (@)</Label>
            <Input
              id="mb-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@seu_perfil"
              className="h-11"
              style={{ background: "#111", borderColor: accent, color: "#fff" }}
              maxLength={200}
            />
          </div>
          <Button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full h-11 font-black uppercase tracking-wider"
            style={{ background: accent, color: "#111" }}
          >
            {loading ? "Resgatando..." : "🎁 RESGATAR BÔNUS"}
          </Button>
          <p className="text-[10px] text-center text-white/70">
            Válido apenas uma vez por pedido.
          </p>
        </>
      )}
    </div>
  );
}
