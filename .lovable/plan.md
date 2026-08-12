# Plano de Implementação: Modo BUILD-FIRST (v625)

Este plano estabelece a transição definitiva para o modo operacional **BUILD-FIRST**, priorizando a construção e entrega funcional do produto. Operações auxiliares (memória, auditoria, âncoras) tornam-se camadas de suporte silenciosas e secundárias.

## Ações Técnicas

### 1. Refatoração do Protocolo de Risco (v625)

Reescrever `.lovable/memory/preferences/protocolo-de-risco.md` para consolidar a nova hierarquia:

**Objetivo Funcional > Implementação > Estabilidade > Testes > Suporte Interno**

Instituir como ciclo operacional padrão:

**ENTENDER → CONSTRUIR → TESTAR → CORRIGIR → ENTREGAR**

Definir regras de **Silêncio Operacional** para manutenção de infraestrutura de memória, índices, âncoras e demais processos internos.

A auditoria deve ser proporcional à necessidade da tarefa e não deve substituir a implementação quando a solução estiver suficientemente clara e segura para execução.

### 2. Consolidação de Respostas Funcionais

Configurar a diretriz de resposta para que o sucesso seja medido principalmente por **resultados concretos e verificáveis**, como:

* código implementado ou alterado;
* funcionalidade criada;
* bug corrigido;
* UI modificada;
* integração realizada;
* teste executado;
* build validado.

Não utilizar relatórios de processos internos como substitutos de uma entrega funcional.

É proibido considerar como conclusão principal de uma tarefa funcional apenas:

* sincronização de memória;
* atualização de índice;
* auditoria;
* validação de integridade;
* preservação de âncoras;
* desbloqueio de build;
* versionamento interno.

Se houver uma tarefa funcional pendente e a implementação for tecnicamente segura, **continuar a execução da tarefa principal**.

### 3. Sincronização de Memória

Atualizar `.lovable/memory/index.md` para refletir:

* a versão v625;
* o modo BUILD-FIRST;
* a nova hierarquia de prioridades;
* a prioridade da execução funcional;
* o caráter secundário dos processos internos.

A sincronização deve ocorrer como suporte ao desenvolvimento e não deve interromper ou substituir uma implementação funcional.

## Regras Operacionais

### BUILD-FIRST

Quando a solicitação estiver clara e puder ser implementada com segurança:

**IMPLEMENTAR PRIMEIRO.**

Não transformar automaticamente uma tarefa de desenvolvimento em uma auditoria extensa.

### AUDITORIA PROPORCIONAL

Auditoria aprofundada somente quando:

* solicitada pelo usuário;
* houver erro complexo;
* existir risco real;
* houver possível regressão;
* existir conflito arquitetural;
* a investigação for necessária para permitir a implementação.

### SILÊNCIO OPERACIONAL

Memória, índices, âncoras, Antidote Pro, Ledger, RLS, integridade e versionamento são mecanismos auxiliares.

Devem permanecer em segundo plano sempre que possível.

**Processo interno não é progresso funcional.**

### CONTINUIDADE

Se uma operação interna for necessária durante uma tarefa:

**EXECUTAR → RETORNAR À TAREFA PRINCIPAL.**

Não criar uma nova missão de auditoria a partir de uma operação interna.

### NÃO PARAR NO DIAGNÓSTICO

Se a causa de um problema for encontrada e a correção puder ser aplicada com segurança:

**CORRIGIR → TESTAR → CONTINUAR.**

Não encerrar a tarefa apenas informando que a causa raiz foi encontrada.

## Detalhes Técnicos

**Versionamento:** v625 (BUILD-FIRST)

**Foco:** Engenharia Executora

**Prioridade:** Evolução funcional do produto

**Ciclo padrão:** ENTENDER → CONSTRUIR → TESTAR → CORRIGIR → ENTREGAR

**Regra de Ouro:** Resultados Concretos > Relatórios de Auditoria

## Impacto Esperado

**Velocidade:** redução de ciclos analíticos redundantes.

**Foco:** maior concentração da inteligência na construção e evolução do produto.

**Qualidade:** auditoria e testes continuam ativos como mecanismos de proteção.

**Experiência:** respostas focadas no que foi efetivamente construído, corrigido ou validado.

**Transparência:** processos de suporte permanecem silenciosos e só aparecem quando forem relevantes para a tarefa.

## PRINCÍPIO FINAL

**A auditoria protege o desenvolvimento.
A memória apoia o desenvolvimento.
Os testes validam o desenvolvimento.
Mas o Agente existe principalmente para CONSTRUIR o produto.**

**BUILD-FIRST — v625**
