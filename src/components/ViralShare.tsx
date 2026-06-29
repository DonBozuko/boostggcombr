import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";

const SITE = "https://eliteboostprime.lovable.app";

// Frase oficial unificada (dinâmica de preços — sem valores engessados).
const SHARE_TEXT =
  "Comprei seguidores na EliteBoost Prime e meu Instagram disparou de verdade! Entrega rápida, segura e com inteligência artificial. Faça o seu teste também:";

export function ViralShare({ route = "/" }: { route?: string }) {
  void route; // mantido para compat de assinatura; mensagem é universal
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        // `url` já é anexado pelo SO — não duplicar dentro de `text`.
        await navigator.share({ title: "EliteBoost Prime", text: SHARE_TEXT, url: SITE });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SITE}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
        🎁 Compartilhamento Premiado
      </div>
      <p className="text-xs text-zinc-300 mt-1">
        Compartilhe a EliteBoost Prime e ganhe <b>bônus exclusivo</b> na sua próxima compra.
      </p>
      <Button
        type="button"
        onClick={handleShare}
        className="w-full mt-3 h-11 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold hover:opacity-90"
      >
        {copied ? <><Check className="size-4 mr-2" /> Link copiado!</> : <><Share2 className="size-4 mr-2" /> Compartilhar e ganhar bônus</>}
      </Button>
    </div>
  );
}
