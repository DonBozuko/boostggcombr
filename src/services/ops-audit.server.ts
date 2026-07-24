// v233 — Auditoria Operacional Permanente (modo forense).
// Fecha o ciclo de prova: não confia em "cron rodou", confere o RESULTADO real
// (HTTP do endpoint, pedido entregue, caixa lançado, e-mail entregue).
// Só alerta quando existe impacto real (dinheiro ou cliente). Ruído é registrado, não enviado.

export type OpsFinding = {
  code: string;
  severity: "critical" | "warning";
  titulo: string;
  problema: string;
  o_que_fazer: string;
  evidencia: any;
};

export type OpsAuditReport = {
  ok: boolean;
  generated_at: string;
  findings: OpsFinding[];
  snapshot: any;
  telegram_enviado: boolean;
};

export async function runOpsAudit(options: { notify?: boolean } = {}): Promise<OpsAuditReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: snap }, { data: http }] = await Promise.all([
    (supabaseAdmin as any).rpc("ops_forensics"),
    (supabaseAdmin as any).rpc("ops_http_health", { _hours: 6 }),
  ]);

  const s = (snap ?? {}) as any;
  const h = (http ?? {}) as any;
  const findings: OpsFinding[] = [];

  // 1) Robôs que dispararam mas o destino recusou (404/401) — falso "verde"
  const naoEncontrado = Number(h.nao_encontrado_404 ?? 0);
  const semPermissao = Number(h.sem_permissao_401_403 ?? 0);
  if (naoEncontrado > 0 || semPermissao > 0) {
    findings.push({
      code: "ROBO_CHAMADA_RECUSADA",
      severity: "critical",
      titulo: "Robô automático rodando no vazio",
      problema: `Nas últimas 6h houve ${naoEncontrado} chamada(s) para endereço inexistente e ${semPermissao} recusada(s) por senha inválida. O robô aparece como "OK" mas nada foi feito.`,
      o_que_fazer: "Me avise: preciso corrigir o endereço/senha do robô no agendador.",
      evidencia: h,
    });
  }

  const erro5xx = Number(h.erro_servidor_5xx ?? 0);
  if (erro5xx >= 3) {
    findings.push({
      code: "ROBO_ERRO_SERVIDOR",
      severity: "critical",
      titulo: "Robô batendo em erro do servidor",
      problema: `${erro5xx} chamadas retornaram erro de servidor nas últimas 6h.`,
      o_que_fazer: "Me avise para investigar o log da rota que está quebrando.",
      evidencia: h,
    });
  }

  // 2) Cliente pagou e não recebeu
  const travados = Array.isArray(s.pedidos_pagos_sem_entrega) ? s.pedidos_pagos_sem_entrega : [];
  const travadosGraves = travados.filter((p: any) => Number(p.idade_horas ?? 0) >= 12);
  if (travadosGraves.length > 0) {
    findings.push({
      code: "PAGO_SEM_ENTREGA",
      severity: "critical",
      titulo: "Cliente pagou e ainda não recebeu",
      problema: `${travadosGraves.length} pedido(s) pago(s) há mais de 12h sem entrega confirmada.`,
      o_que_fazer: "Abra o painel na aba CARRINHOS & PEDIDOS e confirme ou reembolse.",
      evidencia: travadosGraves,
    });
  }

  // 3) Venda concluída sem lançamento no caixa (buraco contábil)
  const semCaixa = Array.isArray(s.vendas_sem_caixa) ? s.vendas_sem_caixa : [];
  if (semCaixa.length > 0) {
    const total = semCaixa.reduce((a: number, v: any) => a + Number(v.valor ?? 0), 0);
    findings.push({
      code: "VENDA_SEM_CAIXA",
      severity: "warning",
      titulo: "Venda entregue sem lançamento no caixa",
      problema: `${semCaixa.length} venda(s) somando R$ ${total.toFixed(2)} não aparecem na tesouraria.`,
      o_que_fazer: "Sem urgência: o lucro real está subestimado nesse valor.",
      evidencia: semCaixa.slice(0, 10),
    });
  }

  // 4) Fila de e-mail morrendo
  const email = (s.email ?? {}) as any;
  if (Number(email.dlq_24h ?? 0) > 0 || Number(email.pending_travado ?? 0) > 0) {
    findings.push({
      code: "EMAIL_NAO_ENTREGUE",
      severity: "warning",
      titulo: "E-mail não chegou no cliente",
      problema: `${email.dlq_24h ?? 0} e-mail(s) desistiram de enviar e ${email.pending_travado ?? 0} estão parados na fila.`,
      o_que_fazer: "Sem urgência: o cliente não recebeu o aviso automático.",
      evidencia: email,
    });
  }

  // 5) Pix parado sem tentativa de recuperação
  const pix = Array.isArray(s.pix_pendente) ? s.pix_pendente : [];
  const pixSemRecuperacao = pix.filter(
    (p: any) => !p.email_recuperacao_enviado && Number(p.idade_horas ?? 0) >= 2,
  );
  if (pixSemRecuperacao.length > 0) {
    const total = pixSemRecuperacao.reduce((a: number, v: any) => a + Number(v.valor ?? 0), 0);
    findings.push({
      code: "PIX_SEM_RECUPERACAO",
      severity: "warning",
      titulo: "Pix gerado e não pago, sem contato",
      problema: `${pixSemRecuperacao.length} cliente(s) somando R$ ${total.toFixed(2)} não receberam nenhuma mensagem de recuperação.`,
      o_que_fazer: "Painel > CARRINHOS & PEDIDOS > Central de Recuperação: chame no WhatsApp.",
      evidencia: pixSemRecuperacao,
    });
  }

  // 6) Robô parado (agendado mas sem execução no prazo)
  const crons = Array.isArray(s.crons) ? s.crons : [];
  const parados = crons.filter((c: any) => {
    if (!c.active) return true;
    const sched = String(c.schedule ?? "");
    if (!sched.includes("*/") && !sched.includes("-")) return false; // diários/mensais fora do escopo
    const stale = c.stale_minutes;
    return stale === null || Number(stale) > 90;
  });
  if (parados.length > 0) {
    findings.push({
      code: "ROBO_PARADO",
      severity: "critical",
      titulo: "Robô automático parou de rodar",
      problema: `${parados.length} robô(s) frequentes sem execução recente: ${parados.map((c: any) => c.jobname).join(", ")}.`,
      o_que_fazer: "Me avise para reativar o agendamento.",
      evidencia: parados,
    });
  }

  const critical = findings.filter((f) => f.severity === "critical");
  let telegramEnviado = false;

  if (options.notify && critical.length > 0) {
    const { dispatchTelegramAlert } = await import("@/lib/messaging");
    const texto = [
      "🔎 AUDITORIA FORENSE — problemas que afetam dinheiro ou cliente",
      "",
      ...critical.map(
        (f) => `⚠️ ${f.titulo}\nPROBLEMA: ${f.problema}\nO QUE FAZER: ${f.o_que_fazer}`,
      ),
    ].join("\n\n");
    const r = await dispatchTelegramAlert(texto, { severity: "critical", origem: "ops-audit" });
    telegramEnviado = r.ok;
  }

  try {
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_email: "system@ops-audit",
      action: "ops_audit_v233",
      detail: {
        criticos: critical.length,
        total: findings.length,
        codigos: findings.map((f) => f.code),
        ts: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[ops-audit] log fail", e);
  }

  return {
    ok: critical.length === 0,
    generated_at: new Date().toISOString(),
    findings,
    snapshot: { ...s, http_health: h },
    telegram_enviado: telegramEnviado,
  };
}
