// v160 — Realtime subscriber para tabelas críticas do painel admin.
// Substitui polling de 60s por push instantâneo via Postgres Changes.
//
// SEGURANÇA: uso EXCLUSIVO em telas de admin (diretor autenticado). O canal só
// serve como gatilho de "recarregar" — nenhum payload de linha é lido aqui, e as
// políticas de RLS de `pedidos` só entregam linhas ao diretor. Nunca usar este
// hook em rota pública/cliente (rastreio de pedido usa server function com
// service_role e retorna apenas status, sem PII).
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Table =
  | "pedidos"
  | "admin_treasury"
  | "virtual_wallets"
  | "fornecedores"
  | "financial_ledger"
  | "alerts"
  | "admin_audit_logs"
  | "monitoramento_saldo";

/**
 * Chama `onChange` (debounced 400ms) sempre que qualquer uma das tabelas mudar.
 * Uso:
 *   useAdminRealtime(["pedidos", "admin_treasury"], () => reload());
 */
export function useAdminRealtime(tables: Table[], onChange: () => void) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!tables.length) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), 400);
    };

    const channel = supabase.channel(`admin-rt-${tables.join("-")}`);
    for (const t of tables) {
      (channel as unknown as {
        on: (evt: string, cfg: Record<string, unknown>, cb: () => void) => void;
      }).on(
        "postgres_changes",
        { event: "*", schema: "public", table: t },
        trigger,
      );
    }
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")]);
}
