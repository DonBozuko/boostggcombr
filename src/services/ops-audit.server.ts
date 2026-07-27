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

  // v238 — janela de 1h: erro antigo já corrigido não pode manter alerta vermelho.
  // v250 — só alerta se AINDA está falhando agora (últimos 15min). Rajada isolada
  // durante deploy que já se curou sozinha não vira alerta crítico.
  const [{ data: snap }, { data: http }, { data: agora }] = await Promise.all([
    (supabaseAdmin as any).rpc("ops_forensics"),
    (supabaseAdmin as any).rpc("ops_http_health", { _hours: 1 }),
    (supabaseAdmin as any).rpc("ops_http_recent_failures", { _minutes: 15 }),
  ]);

  const s = (snap ?? {}) as any;
  const h = (http ?? {}) as any;
  const now15 = (agora ?? {}) as any;
  const findings: OpsFinding[] = [];

  // 1) Robôs que dispararam mas o destino recusou (404/401) — falso "verde"
  const naoEncontrado = Number(now15.nao_encontrado_404 ?? 0);
  const semPermissao = Number(now15.sem_permissao_401_403 ?? 0);
  if (naoEncontrado > 0 || semPermissao > 0) {
    findings.push({
      code: "ROBO_CHAMADA_RECUSADA",
      severity: "critical",
      titulo: "Robô automático rodando no vazio",
      problema: `Nos últimos 15 minutos houve ${naoEncontrado} chamada(s) para endereço inexistente e ${semPermissao} recusada(s) por senha inválida. O robô aparece como "OK" mas nada foi feito.`,
      o_que_fazer: "Me avise: preciso corrigir o endereço/senha do robô no agendador.",
      evidencia: { agora: now15, ultima_hora: h },
    });
  }


  const erro5xx = Number(h.erro_servidor_5xx ?? 0);
  if (erro5xx >= 3) {
    findings.push({
      code: "ROBO_ERRO_SERVIDOR",
      severity: "critical",
      titulo: "Robô batendo em erro do servidor",
      problema: `${erro5xx} chamadas retornaram erro de servidor na última hora.`,
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

  // 6) Robô parado — v238: tolerância derivada do intervalo REAL do agendamento.
  // Antes qualquer schedule com "*/" era tratado como "frequente" (90min), o que
  // marcava "0 */6 * * *" (a cada 6h) como parado. Agora calcula o intervalo.
  const intervaloMinutos = (sched: string): number | null => {
    const [min, hora] = sched.trim().split(/\s+/);
    if (!min || !hora) return null;
    // minuto com passo: */5, 2-59/5  → intervalo em minutos
    const stepMin = /\/(\d+)/.exec(min)?.[1];
    if (stepMin && (hora === "*" || hora === "*/1")) return Number(stepMin);
    // hora com passo: 0 */6 → intervalo em horas
    const stepHora = /\/(\d+)/.exec(hora)?.[1];
    if (stepHora) return Number(stepHora) * 60;
    if (hora === "*") return 60; // roda em minuto fixo de toda hora
    return null; // diário/mensal — fora do escopo
  };
  const crons = Array.isArray(s.crons) ? s.crons : [];
  const parados = crons.filter((c: any) => {
    if (!c.active) return true;
    const intervalo = intervaloMinutos(String(c.schedule ?? ""));
    if (intervalo === null) return false; // diários/mensais fora do escopo
    const tolerancia = intervalo * 2 + 15;
    const stale = c.stale_minutes;
    return stale === null || Number(stale) > tolerancia;
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

  // 7) v291 — Coerência do catálogo (serviço errado, escada invertida, custo fora
  // da curva). Aditivo: se falhar, a auditoria antiga continua valendo.
  try {
    const { runCatalogCoherence, remediateCoherence } = await import("@/services/catalog-coherence.server");
    const issues = await runCatalogCoherence();
    // v304 — pacote com serviço errado ou custo absurdo sai da vitrine na hora.
    const remediado = await remediateCoherence(issues).catch(() => ({ paused: [], restored: [], errors: 1 }));
    if (remediado.paused.length > 0) {
      console.warn("[ops-audit] v304 pacotes pausados pela coerência", remediado.paused);
    }
    if (remediado.restored.length > 0) {
      console.info("[ops-audit] v308 pacotes religados pela coerência", remediado.restored);
    }

    const grupos = new Map<string, typeof issues>();
    for (const i of issues) {
      if (!grupos.has(i.code)) grupos.set(i.code, []);
      grupos.get(i.code)!.push(i);
    }
    const TITULOS: Record<string, { titulo: string; o_que_fazer: string }> = {
      ESCADA_QUEBRADA: {
        titulo: "Pacote maior está mais barato que o menor",
        o_que_fazer: "Painel > Saúde do Catálogo: revise esses pacotes, o cliente paga mais por menos.",
      },
      PRECO_UNITARIO_INVERTIDO: {
        titulo: "Preço por unidade sobe conforme o pacote cresce",
        o_que_fazer: "Sem urgência: revise a escada dessa categoria.",
      },
      CUSTO_FORA_DA_CURVA: {
        titulo: "Custo de fornecedor muito acima do normal",
        o_que_fazer: "Provável serviço errado vinculado. Confira o ID desse pacote.",
      },
      SERVICO_INCOERENTE: {
        titulo: "Pacote vinculado ao produto errado do fornecedor",
        o_que_fazer: "Troque o ID do fornecedor desse pacote antes que alguém compre.",
      },
      TESTE_SECO_CEGO: {
        titulo: "Catálogo sem revalidação recente",
        o_que_fazer: "O robô de teste seco parou. Me avise para religar.",
      },
    };
    for (const [code, lista] of grupos) {
      const meta = TITULOS[code] ?? { titulo: code, o_que_fazer: "Revisar no painel." };
      findings.push({
        code,
        severity: lista[0].severity,
        titulo: meta.titulo,
        problema: `${lista.length} pacote(s) com problema: ${lista.slice(0, 5).map((i) => `${i.pacote} (${i.detalhe})`).join("; ")}${lista.length > 5 ? "…" : ""}`,
        o_que_fazer: meta.o_que_fazer,
        evidencia: lista.slice(0, 30),
      });
    }
  } catch (e) {
    console.warn("[ops-audit] coerência falhou", e);
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
