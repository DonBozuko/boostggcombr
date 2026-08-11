# Auditoria e Correção de Freshness Atômica (v620)

Implementação de datas de modificação reais e estáticas para o blog, removendo a geração dinâmica (`new Date()`) que causava "fake freshness".

## Diagnóstico Técnico
- **Localização:** `src/routes/blog.$slug.tsx`.
- **Problema:** O campo `dateModified` nos `POSTS` utiliza funções dinâmicas que retornam a data atual a cada acesso.
- **Risco:** Penalização por SEO ("misleading freshness") e falta de integridade semântica no JSON-LD.

## Plano de Ação (v620)

### 1. Refatoração de Tipos e Infraestrutura
- Alterar o tipo `Post` para `dateModified?: string` (removendo `() => string`).
- Simplificar o componente `Route.head` para usar `post.dateModified ?? post.datePublished` diretamente, eliminando a execução de funções.

### 2. Mapeamento de Evidências Editoriais
Buscaremos nos logs de Git e metadados de arquivos as datas reais de alteração para cada post:
- `como-ganhar-seguidores-instagram`
- `e-seguro-comprar-seguidores`
- `melhor-site-comprar-seguidores`
- `comprar-seguidores-pix`
- `comprar-seguidores-cai`
- `como-tirar-instagram-privado`
- `comprar-seguidores-brasileiros-vale-a-pena`

### 3. Implementação Estática
- Substituir `dateModified: () => ...` pela data real confirmada.
- Onde não houver evidência de alteração editorial após a publicação, o campo será omitido ou usará o fallback para `datePublished`.

### 4. Validação e Testes
- Executar `npm run build` para garantir integridade.
- Verificar o JSON-LD gerado via inspeção de rotas.
- Confirmar que a data não muda entre recarregamentos.

## Restrições
- Nenhuma data será inventada.
- Fallback para `datePublished` em caso de ausência de evidência.
- Proibido qualquer alteração estrutural ou de checkout.

**Aguardando autorização final para iniciar a execução.**
