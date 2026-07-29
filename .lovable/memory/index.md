# Memory: index.md
Updated: today

# Project Memory

## Core
Alertas Telegram/WhatsApp SEMPRE em português direto, sem jargão técnico (nada de "SLA", "ledger", "smoke test", "parqueado", "reconciliação"). Formato obrigatório: título claro + "PROBLEMA: ..." + "O QUE FAZER: ...". Bate o olho e entende.
Regra de ouro: só executo mudanças que melhorem resultado do negócio. Barro ideia rasa ou que quebre trava existente (v57 HUD, v168 margin guard, v171 manager) e proponho alternativa melhor.
NADA fake/dormindo em NENHUMA rota (`/`, `/admin`, checkout de redes, blog, status, diagnóstico, etc). Proibido: "em breve", "placeholder", botão disabled decorativo, texto mentindo sobre capacidade real. Todo card/botão/tela = 100% real e funcional. Rótulos como "⚠️ Em manutenção" só podem existir quando ligados a flag real do banco (`admin_settings.isBlocked()`), nunca hardcoded. Se não dá pra entregar de verdade agora, remove — não deixa fantasma.
Toda integração com fornecedor (SMMhype, SMMPainel, Verified, MP, TikTok, etc) deve ser SEMPRE: (1) catálogo/dados COMPLETOS sincronizados do provedor, nunca amostra hardcoded; (2) tabela atualizável em banco, não constante em código; (3) job automático (pg_cron diário mínimo) que mantém tudo fresco; (4) detector automático de variantes (BR/mundial, refill/sem, tiers de qty) que popula `service_id_matrix` sem intervenção manual. Se precisar preencher ID à mão, o sync está incompleto — arruma o sync, não o valor.
Autonomia: quando a opção é claramente segura (não quebra receita, não apaga dado, não expõe segredo, reversível), EXECUTA direto sem pedir confirmação. Só pergunta em decisões irreversíveis ou trade-off real de negócio.
Build só passa com `vitest run` verde (gate v243). Fluxo crítico novo/corrigido nasce com teste em `src/__tests__/`, e regra de dinheiro/entrega vive em módulo puro testável. Nunca remover o gate pra destravar deploy.
Sinal verde é sempre ESCOPADO ao que tem detector; tudo sem invariante é declarado "NÃO COBERTO". Ver [Sinal verde escopado](mem://preferences/sinal-verde-escopado).
Motor forte, não motor novo: proibido criar detector novo se um existente cobre; teste órfão ou detector fantasma quebra o build. Ver [Motor forte](mem://constraints/motor-forte-nao-motor-novo).
Ordem sagrada do dinheiro: preflight de rota ao vivo → cobrança → despacho. Nunca cobrar sem provar que dá pra entregar agora. Ver [Nunca cobrar sem preflight](mem://preferences/nunca-cobrar-sem-preflight).
Pedido pago nunca espera clique humano pra andar, e cliente só vê 8 status públicos traduzidos por `src/lib/order-status.ts`. Ver [Fila e status canônico](mem://features/fila-e-status-canonico).
Falta de saldo NUNCA tira pacote da vitrine nem pinta vermelho — é aviso amarelo forçado no celular. Só estrutural e margem pausam. Ver [Saldo nunca pausa](mem://constraints/saldo-nunca-pausa).
Falta de saldo também NUNCA recusa cobrança (v352): vende, avisa na hora com force, pedido espera a recarga e sai sozinho. Ver [Saldo nunca bloqueia venda](mem://constraints/saldo-nunca-bloqueia-venda).
Custo só pode vir de fornecedor que aceita a quantidade do pacote (min/max) — a mesma faixa que o despacho usa, inclusive no recusto de reserva. Ver [Custo só de quem entrega](mem://constraints/custo-so-de-quem-entrega) e [Recusto respeita a faixa](mem://constraints/recusto-respeita-faixa).
Custo que julga margem sai do MESMO ID vinculado que o despacho vai usar — nunca do ID semente do código. Ver [Custo do serviço despachado](mem://constraints/custo-do-servico-despachado).
ID de fornecedor é descartável: se sumir/mudar, o vínculo é refeito por impressão digital (rede+produto) + faixa de quantidade + custo. Nunca por nome parecido. Ver [ID descartável](mem://constraints/id-descartavel).
ID de fornecedor gravado no banco vence o ID chumbado no código; a sincronização nunca desfaz vínculo bom. Ver [Vínculo do banco vence o código](mem://constraints/vinculo-banco-vence-codigo).



Modo Orquestrador (regra absoluta): antes de mexer, mapear impacto cruzado, definir ordem de execução, rollback e prova real. Causa raiz > remendo. Ver [Modo Orquestrador](mem://preferences/modo-orquestrador).
Documento nunca manda no código: `ARQUITETURA.md` e os arquivos em `.lovable/*.md` são índice, não verdade. Se divergirem do código, o CÓDIGO vence e eu corrijo o documento no mesmo turno. Proibido cravar service ID, preço ou número que o sync muda sozinho dentro de documento.
Toda tarefa começa com rótulo: RÁPIDO (executo direto) · MÉDIO (mostro mapa de impacto e executo) · PESADO (dinheiro/dispatch/auth/migração — aviso que preciso do turno inteiro pra analisar antes de codar). Ver [Protocolo de trabalho](mem://preferences/protocolo-de-trabalho).
Problema achado por acaso = falha de instrumentação. Todo bug vira invariante automatizada + teste + achado na auditoria forense. Ver [Bug vira invariante](mem://preferences/bug-vira-invariante).
Regra 2x: se o mesmo TIPO de problema aparecer pela 2ª vez, patch é proibido. Mapear a rota inteira e matar a causa, com trava antes da cobrança. Ver [Regra 2x](mem://preferences/regra-2x-causa-raiz).
Medidor antes do remédio: antes de caçar bug, checar se o instrumento não é o defeito. Alerta nunca herda "critical"; no-op não conta como mudança; escolha de fornecedor tem histerese de 5%; oscilação de catálogo se diagnostica em `catalog_changes`, não por achismo. Ver [Medidor antes do remédio](mem://preferences/medidor-antes-do-remedio).


Preço tem dono único: só `price-authority.server.ts` grava `price_brl`; teste barra qualquer segundo escritor. Ver [Preço dono único](mem://preferences/preco-dono-unico).
Modo Torre (Clean Code): antes de codar, listar arquivos que vou criar/alterar/deletar. Arquivo pequeno, lógica em hook, feature em `src/features/`. Pedido vago ou grande = parar e fazer as 4 perguntas. Fechar ciclo perguntando sobre limpeza de lixo. Ver [Modo Torre](mem://preferences/modo-torre-clean-code).

## Memories
- [Moeda única BRL](mem://constraints/moeda-unica-brl) — Dinheiro sempre em BRL. `monitoramento_saldo.saldo` é USD legado; usar `saldo_brl`/`fornecedores.saldo_atual`. Conferir moeda antes de afirmar número.
- [Markup por custo](mem://features/markup-por-custo) — Múltiplo de lucro cai conforme custo do fornecedor sobe (5x→2x), teto de vitrine, piso de revenda. Consultar antes de mexer em preço.
- [Fonte única de ID de fornecedor](mem://constraints/fonte-unica-id-fornecedor) — Proibido ID chumbado no código; catálogo vivo manda e toda escrita passa pelo portão bind-guard. Consultar antes de mexer em vínculo/roteamento.
- [Protocolo de trabalho](mem://preferences/protocolo-de-trabalho) — Como a dupla conduz tarefas: rótulo de complexidade, quando pedir sinal verde, código > documento, fechamento de ciclo, auditoria de coerência.
- [Modo Orquestrador](mem://preferences/modo-orquestrador) — Como planejar e executar qualquer mudança: mapa de impacto, ordem, ponto único de verdade, rollback, prova real, anti-loop de alarme.
- [Evolução futura](mem://preferences/evolucao-futura) — Lembrar de evoluir módulos "honestos mas limitados" (ex: JarvisContentScheduler → publicação real) quando chip/warmup/API estiverem prontos. Usuário quer evoluir TUDO no futuro.
- [Nunca responder de memória sobre operação](mem://preferences/nunca-responder-de-memoria) — Fornecedor ≠ rede. Fornecedores = smmhype, smmpainel, verified, provider4 (tabela `fornecedores`). Kwai/Instagram/TikTok = redes (rotas). Antes de afirmar, consultar banco/código.
- [Pacote :br só serviço BR](mem://preferences/pacote-br-so-servico-br) — Pacote brasileiro nunca pode apontar pra serviço internacional nem pra serviço marcado como queda/"não compre". Validado no dry-run v240.
- [Nunca cobrar sem preflight](mem://preferences/nunca-cobrar-sem-preflight) — v297: checagem ao vivo de rota antes de gerar Pix/cartão, fail-open em timeout, fail-closed com veredito, auto-cura da prateleira.
- [Nunca cobrar sem validar o alvo](mem://preferences/nunca-cobrar-sem-validar-alvo) — v301: perfil do Instagram precisa existir e estar público antes da cobrança; fail-open em instabilidade; mensagem clara no checkout.
- [Modo Torre (Clean Code)](mem://preferences/modo-torre-clean-code) — Contrato de ciclo fechado: anti-arquivo-gigante, modular por feature, deletar lixo na hora, listar arquivos antes de codar, 4 perguntas de direcionamento.
- [Regra 2x — causa raiz](mem://preferences/regra-2x-causa-raiz) — Problema repetido 2x proíbe patch: mapear rota do dinheiro, atacar o que o fornecedor muda sem o sistema perceber, trava antes da cobrança + teste de regressão.
- [Medidor antes do remédio](mem://preferences/medidor-antes-do-remedio) — v316/v317: severidade de alerta derivada em módulo único, no-op não conta como mudança, histerese de fornecedor (5%), livro-razão `catalog_changes` como fonte de verdade de oscilação.


- [Bancada Autônoma](mem://features/bancada-autonoma) — v323: robô a cada 2h prova entrega de TODOS os pacotes contra fornecedores, grava em `bench_runs`/`bench_findings`, pausa/religa sozinho e só alerta quando falta recarga.
- [Alarme que não anda](mem://preferences/alarme-que-nao-anda) — v334: limiar de margem/dinheiro só pode existir no módulo dono (`margin-guardian`), varredura quebra o build se duplicar; achado repetido 6 varreduras vira defeito de engenharia com alerta próprio.
- [Prateleira honesta](mem://preferences/prateleira-honesta) — Vitrine só mostra o que a Bancada prova que entrega: sem fallback estático, sem aba vazia, sem texto prometendo linha indisponível.
- [Sem percentual chutado](mem://preferences/sem-percentual-tres-numeros) — v354: proibido dizer "sistema está X%". Vale o Termômetro Real (30d) no painel SLO: entrega sem toque humano, tempo pago→entregue e estornos no mês.
- [Alerta repete = versão velha](mem://constraints/alerta-repete-versao-publicada) — v361: crons rodam o build PUBLICADO; alerta de não-convergência carrega APP_VERSION (`src/lib/build-stamp.ts`). Correção só no preview mantém o mesmo aviso.
- [Dupla leitura de custo](mem://constraints/alerta-repete-versao-publicada) — v361: pausa por margem exige custo vivo E custo gravado reprovando; diferença ≤5% é ruído (não pausa), >5% é prejuízo real (pausa).
