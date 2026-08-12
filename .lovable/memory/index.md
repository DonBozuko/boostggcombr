# Project Memory

## Core
Protocolo de Risco (v622): Matriz de autonomia e execução granular baseada em criticidade.
Ritmo Adaptativo (v570): Agilidade extrema em confirmações simples vs. análise forense em problemas complexos.
Escrita Atômica (v383): Trava idempotente anti-gasto duplo em `dispatch-commit.server.ts`.
Margem > Vitrine > Receita: Hierarquia de decisão em `tolerancia-e-hierarquia.md`.
Hierarquia de Identidade: BOOSTGG (Marca de Venda) > Elite Boost Prime (Nome Fantasia Legal). Nunca misturar em SEO.
Protocolo Antidote Pro (v617): Blindagem contra caracteres invisíveis (U+2063).

## Memories
- [Alerta que repete = versão publicada velha](mem://constraints/alerta-repete-versao-publicada) — Crons rodam o build PUBLICADO; correção só no preview mantém o mesmo alerta. Todo alerta de não-convergência carrega APP_VERSION.
- [Custo de decisão vem do serviço que será despachado (v360)](mem://constraints/custo-do-servico-despachado) — O custo usado para julgar margem tem de sair do MESMO ID de fornecedor que o dispatch vai usar. Foi a causa do loop "PACOTE APOSENTADO" nos pacotes de YouTube Views.
- [Custo só vale de fornecedor que entrega a quantidade](mem://constraints/custo-so-de-quem-entrega) — Proibido precificar com o custo de um fornecedor cujo serviço não aceita a quantidade do pacote (min/max). Custo e despacho olham a mesma faixa.
- [Dupla leitura de custo antes de pausar por margem](mem://constraints/dupla-leitura-de-custo) — Pausa por margem exige custo vivo E custo gravado reprovando; diferença ≤5% é ruído de tarifa, >5% é prejuízo real.
- [Fonte única de verdade para IDs de fornecedor](mem://constraints/fonte-unica-id-fornecedor) — Proibido ID de serviço chumbado no código; catálogo vivo do fornecedor manda, e todo vínculo passa pelo portão bind-guard
- [ID de fornecedor é descartável (v362)](mem://constraints/id-descartavel) — Quando o ID do fornecedor some ou muda, o vínculo é refeito por impressão digital (rede+produto) + faixa de quantidade + custo. Nunca por nome parecido com o pacote.
- [Moeda única é BRL](mem://constraints/moeda-unica-brl) — Todo valor de dinheiro no sistema é BRL. monitoramento_saldo.saldo é USD legado — ler saldo_brl. Nunca comparar número de saldo sem confirmar a moeda.
- [Motor forte, não motor novo (v366)](mem://constraints/motor-forte-nao-motor-novo) — Proibido criar detector/motor novo quando um existente pode ser fortalecido; todo teste precisa estar reivindicado no mapa de cobertura.
- [Nada fake em nenhuma rota](mem://constraints/nada-fake-nas-rotas) — Proibido placeholder, "em breve", botão decorativo ou texto que mente sobre capacidade real — em qualquer rota, inclusive admin.
- [Projeto único — sem painel de revenda paralelo](mem://constraints/projeto-revenda-unico) — O projeto separado de revenda foi excluído. Área de revenda vive só neste projeto (/revenda, /painel-revendedor, API v1).
- [Recusto de reserva também respeita a faixa (v358)](mem://constraints/recusto-respeita-faixa) — recostFromReserves só pode usar tarifa de serviço que aceita a quantidade do pacote. Foi a causa do loop "PACOTE APOSENTADO" em p350k/p500k.
- [Regra que pausa tem de andar sozinha (v371)](mem://constraints/regra-que-nao-anda) — Proibido estado que pausa e congela sem caminho de saída automático. Foi a causa do "alarme que não anda" em br-tf100/br-tf500.
- [Saldo nunca bloqueia a venda (v352)](mem://constraints/saldo-nunca-bloqueia-venda) — v352 — falta de saldo no fornecedor não pausa pacote (v350) E não recusa cobrança. Vende, avisa o dono na hora e o pedido sai sozinho na recarga.
- [Saldo nunca tira pacote da vitrine](mem://constraints/saldo-nunca-pausa) — v350 — falta de saldo em fornecedor é aviso (amarelo, chega no celular na hora), nunca motivo de pausar pacote ou pintar vermelho. Só catálogo/fornecedor e margem negativa pausam.
- [Sincronização de fornecedor tem que ser completa](mem://constraints/sync-fornecedor-completo) — Catálogo inteiro vindo do provedor, em tabela do banco, com job automático e detector de variantes — nunca amostra hardcoded nem ID preenchido à mão.
- [Vínculo do banco vence a semente do código (v359)](mem://constraints/vinculo-banco-vence-codigo) — O motor de preço não pode regravar smmhype_service_id com o ID chumbado no código. O vínculo gravado só perde a vez se ele mesmo não entregar a quantidade.
- [Prova contínua de entrega (Bancada Autônoma)](mem://features/bancada-autonoma) — v323 — o sistema testa sozinho todos os pacotes contra os fornecedores a cada 2h, grava veredito no banco, corrige o que dá e só chama o dono quando falta dinheiro
- [Escopo Fechado (linha de chegada v397+)](mem://features/escopo-fechado) — Escopo oficial 100% concluído em 01/08/2026. Projeto em modo manutenção. Nada fora da lista entra sem alerta de fora-de-escopo.
- [Fila autônoma e status canônico (v324/v325)](mem://features/fila-e-status-canonico) — Pedido pago nunca depende de clique humano para andar; cliente só vê 8 status públicos, traduzidos por um módulo único.
- [Markup decrescente por custo (v328)](mem://features/markup-por-custo) — Regra de preço — múltiplo de lucro cai conforme o custo absoluto do fornecedor sobe; teto de vitrine aperta em ticket alto; revenda acompanha o piso
- [Rota Reserva Quente (v406)](mem://features/rota-reserva-quente) — Todo pacote deve ter fornecedor A e B pré-validados; quem responde "tem plano B?" é src/lib/hot-standby.ts, sem régua própria.
- [Alarme que não anda é defeito nosso (v334)](mem://preferences/alarme-que-nao-anda) — Regra final — todo achado repetido N ciclos vira defeito de engenharia, e nenhum limiar de dinheiro pode existir duplicado fora do seu módulo dono
- [Alertas em português direto](mem://preferences/alertas-em-portugues) — Formato obrigatório de todo alerta Telegram/WhatsApp — título claro, PROBLEMA, O QUE FAZER, sem jargão técnico.
- [Todo bug vira invariante automatizada](mem://preferences/bug-vira-invariante) — Sempre que um problema aparecer "do nada", criar detector permanente (invariante + teste) em vez de só corrigir o caso. Nada de caça ao tesouro manual.
- [Dívidas técnicas aceitas](mem://preferences/dividas-aceitas) — Itens conhecidos que decidimos NÃO consertar e o motivo — não reabrir sem novo motivo de negócio
- [Escada de Autonomia (v391)](mem://preferences/escada-de-autonomia) — Toda família de falha declara nível 1/2/3 em src/lib/autonomy-ladder.ts — detector sem executor é defeito nosso, não trabalho do dono.
- [evolucao-futura](mem://preferences/evolucao-futura) — Lembrar o usuário de evoluir funcionalidades marcadas como "rascunho honesto" (opção B) para versão real (opção C) quando o contexto permitir.
- [Medidor antes do remédio (v316/v317)](mem://preferences/medidor-antes-do-remedio) — Antes de caçar bug de comportamento, verificar se o instrumento que aponta o problema (severidade de alerta, contador, threshold) não é ele próprio o defeito.
- [Modo Orquestrador (regra absoluta)](mem://preferences/modo-orquestrador) — Em toda resposta e mudança, agir como orquestrador do sistema inteiro — mapear impacto cruzado, ordem de execução, rollback e prova real antes de tocar em qualquer coisa.
- [Modo Torre (Clean Code, ciclo fechado)](mem://preferences/modo-torre-clean-code) — Contrato de desenvolvimento — arquitetura modular por feature, arquivos pequenos, ciclo Começo/Meio/Fim e 4 perguntas obrigatórias quando o pedido for vago ou grande demais.
- [Motor Anti-Alucinação (v398)](mem://preferences/motor-anti-alucinacao) — Toda auditoria e toda afirmação técnica começam rodando `npm run audit`; alarme falso se corrige calibrando o medidor, nunca inventando trabalho.
- [Nunca cobrar sem preflight de rota](mem://preferences/nunca-cobrar-sem-preflight) — Regra de dinheiro — nenhuma cobrança (Pix ou cartão) pode ser gerada sem antes provar, ao vivo, que existe fornecedor capaz de entregar aquele pacote agora.
- [Nunca cobrar sem validar o alvo](mem://preferences/nunca-cobrar-sem-validar-alvo) — Regra de dinheiro v301 — além da rota (v297), o alvo (perfil) precisa existir e estar público antes de gerar cobrança de seguidores de Instagram.
- [Nunca responder de memória sobre operação](mem://preferences/nunca-responder-de-memoria) — Antes de afirmar qualquer coisa sobre fornecedor, rota, rede social, saldo, pedido, cron, RLS ou config — consultar banco/código primeiro. Nada de memória.
- [Pacote :br só pode usar serviço brasileiro real](mem://preferences/pacote-br-so-servico-br) — Regra de catálogo — qualquer pacote com categoria terminada em :br só pode ser vinculado a serviço de fornecedor com "brasil/brazil/brasileir/🇧🇷" no nome, e nunca a serviço marcado como queda/não compre.
- [Portão de Risco (v393)](mem://preferences/portao-de-risco) — Antes de executar qualquer pedido do dono, classificar zona vermelha/amarela/verde, listar travas atravessadas e reescrever o pedido em versão segura.
- [Prateleira honesta (v335)](mem://preferences/prateleira-honesta) — Vitrine só mostra o que o sistema prova que entrega — sem fallback estático, sem aba vazia, sem promessa de linha indisponível
- [Preço tem dono único (v305)](mem://preferences/preco-dono-unico) — Só src/lib/price-authority.server.ts pode gravar price_brl. Qualquer outro motor que escrever preço é bug — existe teste que barra o deploy.
- [Protocolo de Risco](mem://preferences/protocolo-de-risco) — Define a matriz de autonomia e execução baseada na criticidade da tarefa.
- [Protocolo de trabalho da dupla (Fabiano + Lovable)](mem://preferences/protocolo-de-trabalho) — Como conduzir qualquer tarefa — sinalizar complexidade antes, pedir sinal verde só quando irreversível, fechar ciclo com documento e código alinhados.
- [Protocolo de Reconhecimento de Excelência (v575)](mem://preferences/protocolo-excelencia-v575) — Restaura a postura de Orquestrador e Auditor Forense de 5 semanas atrás, priorizando análise sistêmica, causa raiz e argumentação técnica profunda sobre velocidade.
- [Regra 2x — problema repetido vira causa raiz](mem://preferences/regra-2x-causa-raiz) — Se o mesmo tipo de problema aparecer 2x, é proibido aplicar patch; obrigatório mapear a rota inteira e matar a causa
- [Sem percentual chutado — três números medidos](mem://preferences/sem-percentual-tres-numeros) — v354 — proibido dizer "sistema está X%". O que vale é o Termômetro Real no painel: entrega sem toque humano, tempo pago→entregue e estornos no mês.
- [Sinal verde só vale onde existe detector](mem://preferences/sinal-verde-escopado) — Proibido declarar "tudo certo" de forma ampla. Verde só pode ser dado sobre a lista de invariantes automatizadas; o resto é declarado como NÃO COBERTO.
- [Testes automatizados são gate de deploy](mem://preferences/testes-gate-de-deploy) — Todo fluxo que mexe com dinheiro ou entrega precisa de teste em src/__tests__; build só passa com suíte verde. Regras críticas ficam em módulos puros.
- [Tolerância de falha, hierarquia de regras e ritmo de revisão](mem://preferences/tolerancia-e-hierarquia) — Meta ≤1% de falha por semana (zero só para cobrar-sem-entregar), ordem de desempate Margem > Vitrine > Receita, e relatório semanal de 15 min na sexta.
