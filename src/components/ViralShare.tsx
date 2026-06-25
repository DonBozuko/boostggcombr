import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";

const SITE = "https://boostygram.lovable.app";

const messagesByRoute: Record<string, string> = {
  "/": "Comprei seguidores no @boostygram e meu Instagram disparou de verdade. Entrega rápida e real:",
  "/tiktok": "Boostygram fez meu TikTok bombar no FYP. Views reais em horas:",
  "/youtube": "WatchTime real e inscritos com a Boostygram. Canal monetizando:",
  "/facebook": "Boostygram subiu o engajamento da minha página no Facebook de forma orgânica:",
  "/telegram": "Meu canal do Telegram lotou com a Boostygram. Membros reais:",
  "/trafego": "Tráfego orgânico real no meu site com a Boostygram. SEO local funcionou:",
};

export function ViralShare({ route = "/" }: { route?: string }) {
  const [copied, setCopied] = useState(false);
  const text = (messagesByRoute[route] ?? messagesByRoute["/"]) + " " + SITE;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Boostygram", text, url: SITE });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
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
        Compartilhe a Boostygram e ganhe <b>bônus exclusivo</b> na sua próxima compra.
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
