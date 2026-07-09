import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Gift } from "lucide-react";
import { setBrindeApplied } from "@/components/CouponField";

const SITE = "https://boostgg.com.br";

// v104 — Voucher de retenção viral em SEGUIDORES (sem prejuízo em cash).
const SHARE_TEXT =
  "Comprei seguidores na EliteBoost Prime e meu Instagram disparou de verdade! Entrega rápida, segura e com inteligência artificial. Faça o seu teste também:";

const BRINDE_CODE = "BRINDE50";

export function ViralShare({ route = "/", quantidade }: { route?: string; quantidade?: number }) {
  void route;
  // v144 — Restringe promoção/bônus a pedidos > 200 unidades.
  if (typeof quantidade === "number" && quantidade <= 200) return null;
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const sharedRef = useRef(false);

  // v103 — retorno de foco do navegador dispara a revelação do brinde.
  useEffect(() => {
    const onReturn = () => {
      if (sharedRef.current && !revealed) setRevealed(true); setBrindeApplied();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onReturn();
    });
    return () => {
      window.removeEventListener("focus", onReturn);
    };
  }, [revealed]);

  const handleShare = async () => {
    sharedRef.current = true;
    try {
      if (navigator.share) {
        await navigator.share({ title: "EliteBoost Prime", text: SHARE_TEXT, url: SITE });
        setRevealed(true); setBrindeApplied();
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SITE}`);
      setCopied(true);
      setRevealed(true); setBrindeApplied();
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
        🎁 Compartilhamento Premiado
      </div>
      <p className="text-xs text-zinc-300 mt-1">
        Compartilhe a EliteBoost Prime e ganhe <b>+50 SEGUIDORES GRÁTIS</b> na sua próxima compra.
      </p>
      <Button
        type="button"
        onClick={handleShare}
        className="w-full mt-3 h-11 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold hover:opacity-90"
      >
        {copied ? <><Check className="size-4 mr-2" /> Link copiado!</> : <><Share2 className="size-4 mr-2" /> Compartilhar e ganhar +50 seguidores</>}
      </Button>

      {revealed && (
        <div
          className="mt-3 rounded-lg p-3 text-center"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "2px dashed #10b981",
            boxShadow: "0 0 18px rgba(16,185,129,0.35)",
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2 text-emerald-300 font-extrabold text-sm">
            <Gift className="size-4" /> BRINDE ATIVADO!
          </div>
          <div className="mt-1 text-white font-black text-lg tracking-widest">
            {BRINDE_CODE}
          </div>
          <p className="mt-1 text-[11px] font-bold text-emerald-100/90">
            🎟️ Use <span className="font-black">{BRINDE_CODE}</span> na sua próxima compra e ganhe
            <br />
            <span className="text-emerald-300">+50 SEGUIDORES GRÁTIS</span> adicionados automaticamente ao seu pedido!
          </p>
        </div>
      )}
    </div>
  );
}
