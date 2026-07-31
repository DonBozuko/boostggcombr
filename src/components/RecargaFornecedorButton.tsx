import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getRecargaFornecedores } from "@/lib/fornecedores.functions";
import { toast } from "sonner";

/**
 * v236/v384 — Recarga rápida: abre o painel do fornecedor e copia o Pix salvo.
 * Extraído do admin.tsx para poder aparecer TAMBÉM na Bancada, que é onde o
 * aviso "falta saldo" nasce (antes o botão só existia na aba de fornecedores).
 */
export function RecargaFornecedor({
  slug,
  nome,
  token,
  label,
}: {
  slug: string;
  nome: string;
  token: string;
  label?: string;
}) {
  const getRecarga = useServerFn(getRecargaFornecedores);
  const [busy, setBusy] = useState(false);

  const abrir = async () => {
    if (!token) return toast.error("Faça login no admin primeiro");
    setBusy(true);
    try {
      const res = await getRecarga({ data: { token } });
      if (!res.ok) return toast.error("Não autorizado");
      const item = res.itens.find((i) => i.slug === (slug || "").toLowerCase());
      if (!item) return toast.error(`${nome}: fornecedor não encontrado`);
      if (item.pix) {
        try {
          await navigator.clipboard.writeText(item.pix);
          toast.success(`${nome}: Pix copia-e-cola copiado. Cole no seu banco.`);
        } catch {
          toast.message(`${nome} · Pix copia-e-cola`, { description: item.pix });
        }
      } else {
        toast.message(`${nome}: sem Pix salvo — recarregue pelo painel.`);
      }
      if (item.painelUrl) window.open(item.painelUrl, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={abrir} disabled={busy} className="shrink-0">
      {busy ? "…" : (label ?? "💳 Recarregar")}
    </Button>
  );
}
