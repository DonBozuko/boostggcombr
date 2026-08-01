# Memory: index.md
Updated: today

# Project Memory

## Core
Alertas no celular em português direto: título + "PROBLEMA:" + "O QUE FAZER:", sem jargão técnico. Ver [Alertas em português](mem://preferences/alertas-em-portugues).
Regra de ouro: só executo mudança que melhora resultado do negócio; barro ideia rasa ou que quebre trava existente e proponho alternativa melhor.
Nada fake em nenhuma rota: sem placeholder, "em breve" ou botão decorativo. Ver [Nada fake nas rotas](mem://constraints/nada-fake-nas-rotas).
Integração de fornecedor = catálogo completo + tabela no banco + job automático + detector de variantes. Ver [Sync completo](mem://constraints/sync-fornecedor-completo).
Autonomia: opção segura e reversível eu executo direto; só pergunto em decisão irreversível ou trade-off real de negócio.
Build só passa com `vitest run` verde; fluxo crítico nasce com teste. Ver [Testes são gate de deploy](mem://preferences/testes-gate-de-deploy).
Sinal verde é sempre ESCOPADO ao que tem detector; o resto é declarado "NÃO COBERTO". Ver [Sinal verde escopado](mem://preferences/sinal-verde-escopado).
Motor forte, não motor novo: proibido detector novo se um existente cobre. Ver [Motor forte](mem://constraints/motor-forte-nao-motor-novo).
Ordem sagrada do dinheiro: preflight de rota → preflight de alvo → cobrança → despacho. Ver [Preflight](mem://preferences/nunca-cobrar-sem-preflight) e [Alvo](mem://preferences/nunca-cobrar-sem-validar-alvo).
Pedido pago nunca espera clique humano, e o cliente só vê 8 status públicos. Ver [Fila e status canônico](mem://features/fila-e-status-canonico).
Falta de saldo nunca tira da vitrine nem recusa venda — vira aviso e o pedido sai após a recarga. Ver [Saldo nunca pausa](mem://constraints/saldo-nunca-pausa) e [Saldo nunca bloqueia venda](mem://constraints/saldo-nunca-bloqueia-venda).
Custo só vem de fornecedor que aceita a quantidade do pacote. Ver [Custo só de quem entrega](mem://constraints/custo-so-de-quem-entrega) e [Recusto](mem://constraints/recusto-respeita-faixa).
Custo que julga margem sai do MESMO ID que vai despachar. Ver [Custo do serviço despachado](mem://constraints/custo-do-servico-despachado).
Pausar por margem exige as duas leituras de custo reprovando (≤5% é ruído). Ver [Dupla leitura de custo](mem://constraints/dupla-leitura-de-custo).
Toda pausa precisa de rampa de saída automática — teto por ciclo é velocidade, nunca sentença. Ver [Regra que não anda](mem://constraints/regra-que-nao-anda).
ID de fornecedor é descartável e o vínculo do banco vence o código. Ver [ID descartável](mem://constraints/id-descartavel) e [Vínculo do banco vence](mem://constraints/vinculo-banco-vence-codigo).
Preço tem dono único: só `price-authority.server.ts` grava `price_brl`. Ver [Preço dono único](mem://preferences/preco-dono-unico).
Projeto único: revenda vive só aqui; proibido recriar em outro projeto/banco. Ver [Projeto de revenda único](mem://constraints/projeto-revenda-unico).
Documento nunca manda no código: `ARQUITETURA.md` e `.lovable/*.md` são índice. Se divergir, o CÓDIGO vence e eu corrijo o documento no mesmo turno.
Modo Orquestrador: mapear impacto cruzado, ordem, rollback e prova real antes de mexer. Ver [Modo Orquestrador](mem://preferences/modo-orquestrador).
Portão de Risco: todo pedido passa por triagem (vermelha/amarela/verde) e resposta PEDIU / QUEBRARIA / VERSÃO SEGURA. Ver [Portão de Risco](mem://preferences/portao-de-risco).
Toda tarefa começa com rótulo RÁPIDO · MÉDIO · PESADO. Ver [Protocolo de trabalho](mem://preferences/protocolo-de-trabalho).
Bug achado por acaso é falha de instrumentação: vira invariante + teste. Ver [Bug vira invariante](mem://preferences/bug-vira-invariante).
Regra 2x: mesmo TIPO de problema pela 2ª vez proíbe patch — mata a causa. Ver [Regra 2x](mem://preferences/regra-2x-causa-raiz).
Medidor antes do remédio: conferir se o instrumento não é o defeito antes de caçar bug. Ver [Medidor antes do remédio](mem://preferences/medidor-antes-do-remedio).
Modo Torre: listar arquivos antes de codar, arquivo pequeno, lixo deletado na hora. Ver [Modo Torre](mem://preferences/modo-torre-clean-code).
Detector sem remédio é dívida: toda falha declara nível 1/2/3. Ver [Escada de Autonomia](mem://preferences/escada-de-autonomia).
Mudança em zona vermelha sobe `APP_VERSION` e a resposta diz "precisa publicar". Ver [Alerta repete = versão velha](mem://constraints/alerta-repete-versao-publicada).
Reposição automática (nível 2) LIGADA desde 31/07/2026, teto 10/dia e 10% do pedido. Desliga em Admin → Auditoria → Autonomia.
Escopo FECHADO em 01/08/2026: pedido fora da lista dispara alerta de fora-de-escopo antes de codar. Ver [Escopo Fechado](mem://features/escopo-fechado).

## Memories
- [Motor Anti-Alucinação](mem://preferences/motor-anti-alucinacao) — `npm run audit` lê src/ inteiro e grava .lovable/audit-report.md; gravidades bloqueante/atenção/nota.
- [Moeda única BRL](mem://constraints/moeda-unica-brl) — Dinheiro sempre em BRL. `monitoramento_saldo.saldo` é USD legado; usar `saldo_brl`/`fornecedores.saldo_atual`.
- [Markup por custo](mem://features/markup-por-custo) — Múltiplo de lucro cai conforme o custo sobe (5x→2x), teto de vitrine, piso de revenda. Consultar antes de mexer em preço.
- [Fonte única de ID de fornecedor](mem://constraints/fonte-unica-id-fornecedor) — Catálogo vivo manda; toda escrita passa pelo portão bind-guard.
- [Evolução futura](mem://preferences/evolucao-futura) — Módulos honestos mas limitados a evoluir quando chip/warmup/API estiverem prontos.
- [Nunca responder de memória sobre operação](mem://preferences/nunca-responder-de-memoria) — Fornecedor ≠ rede. Consultar banco/código antes de afirmar.
- [Pacote :br só serviço BR](mem://preferences/pacote-br-so-servico-br) — Pacote brasileiro nunca aponta pra serviço internacional nem marcado como queda.
- [Bancada Autônoma](mem://features/bancada-autonoma) — Robô a cada 2h prova entrega de todos os pacotes, grava em `bench_runs`/`bench_findings`, pausa e religa sozinho.
- [Prateleira honesta](mem://preferences/prateleira-honesta) — Vitrine só mostra o que a Bancada prova que entrega: sem fallback estático, sem aba vazia.
- [Alarme que não anda](mem://preferences/alarme-que-nao-anda) — Limiar de dinheiro só no módulo dono; achado repetido 6 varreduras vira defeito de engenharia.
- [Sem percentual chutado](mem://preferences/sem-percentual-tres-numeros) — Proibido dizer "sistema está X%". Vale o Termômetro Real (30d) no painel SLO.
