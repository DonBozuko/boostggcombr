import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageSquare } from "lucide-react";
import { jivoScripts } from "@/lib/jivo-scripts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "fabiano.majestic@gmail.com";

export const Route = createFileRoute("/admin/scripts")({
  head: () => ({ meta: [{ title: "Scripts Jivo · Admin | BoostGG" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ScriptsPage,
});

const LABELS: Record<keyof typeof jivoScripts, { title: string; when: string }> = {
  telefoneSeguro: { title: "📞 Cliente pediu telefone (padrão)", when: "Use quando pedirem contato mas dá pra segurar no chat." },
  telefoneDireto: { title: "📱 Passar WhatsApp direto", when: "Só quando o pedido for alto ou cliente insistir muito." },
  prazoYoutube: { title: "▶️ Prazo YouTube (12-72h)", when: "Cliente reclamando que inscrito não caiu ainda." },
  primeiraCompra: { title: "🆕 Primeira compra insegura", when: "Cliente com medo do Pix ou de comprar pela primeira vez." },
  pixPendente: { title: "⏳ Pix pendente", when: "Cliente diz que pagou mas não confirmou no sistema." },
  posVenda: { title: "🎉 Pós-venda + pedir e-mail", when: "Após confirmar pagamento — capta e-mail pro fluxo de review." },
};

function ScriptsPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // v209 — Gate real: só o admin master vê os scripts. Antes só tinha noindex, qualquer URL vazava.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email?.toLowerCase() ?? "";
      if (email !== ADMIN_EMAIL) {
        toast.error("Acesso restrito");
        void navigate({ to: "/admin", replace: true });
        setAuthed(false);
      } else {
        setAuthed(true);
      }
    })();
  }, [navigate]);


  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copiado! Cola no Jivo.");
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <MessageSquare className="text-emerald-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold">Scripts Jivo</h1>
            <p className="text-sm text-slate-400">Copia e cola no chat. Antes de passar telefone, sempre tenta resolver aqui.</p>
          </div>
        </header>

        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Regras de ouro:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside text-amber-100/80">
            <li>Só passa WhatsApp quando cliente pedir OU pedido &gt; R$ 100.</li>
            <li>Sempre segura no chat primeiro — histórico = proteção contra chargeback.</li>
            <li>Antes de mandar "telefoneDireto", troca <code className="bg-slate-800 px-1 rounded">(seu-numero)</code> pelo WhatsApp real.</li>
          </ul>
        </div>

        <div className="space-y-4">
          {Object.entries(jivoScripts).map(([key, text]) => {
            const meta = LABELS[key as keyof typeof jivoScripts];
            const isCopied = copied === key;
            return (
              <div key={key} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="font-semibold text-slate-100">{meta.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{meta.when}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => copy(key, text)}
                    className={isCopied ? "bg-emerald-600 hover:bg-emerald-600" : ""}
                  >
                    {isCopied ? <><Check size={14} className="mr-1" /> Copiado</> : <><Copy size={14} className="mr-1" /> Copiar</>}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-slate-950/60 rounded p-3 border border-slate-800/50 font-sans">
{text}
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
