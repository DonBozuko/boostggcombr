// v380 — Bloco "incorpore no seu site".
//
// Entrega um snippet pronto: um link normal (é ele que vale autoridade no Google)
// + um iframe opcional com a contagem ao vivo. Quem copia ganha um widget real;
// nós ganhamos um link real. Nada aqui é decorativo.

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SITE = "https://www.boostgg.com.br";

export function EmbedSnippet({
  tipo,
  toolPath,
  toolTitle,
  placeholder,
}: {
  tipo: "yt";
  toolPath: string;
  toolTitle: string;
  placeholder: string;
}) {
  const [alvo, setAlvo] = useState("");
  const [copiado, setCopiado] = useState(false);

  const limpo = alvo.trim().replace(/^@/, "").replace(/[^A-Za-z0-9._-]/g, "");
  const snippet = useMemo(() => {
    const perfil = limpo || placeholder.replace(/^@/, "");
    return `<iframe src="${SITE}/api/public/badge?tipo=${tipo}&alvo=${perfil}" width="300" height="80" style="border:0;border-radius:14px" loading="lazy" title="${toolTitle}"></iframe>
<p><a href="${SITE}${toolPath}">${toolTitle} — BoostGG</a></p>`;
  }, [limpo, placeholder, tipo, toolPath, toolTitle]);

  return (
    <div className="rounded-2xl border bg-card/60 p-5 space-y-3">
      <h3 className="font-semibold text-foreground">Incorpore no seu site (grátis)</h3>
      <p className="text-sm text-muted-foreground">
        Cole o código abaixo em qualquer página e o número atualiza sozinho. Use o seu perfil ou o de outra pessoa.
      </p>
      <Input value={alvo} onChange={(e) => setAlvo(e.target.value)} placeholder={placeholder} className="max-w-xs" />
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(snippet);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        {copiado ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        {copiado ? "Copiado" : "Copiar código"}
      </Button>
    </div>
  );
}
