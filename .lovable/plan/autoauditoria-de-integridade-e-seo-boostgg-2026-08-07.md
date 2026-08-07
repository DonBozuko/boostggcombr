# Autoauditoria de integridade e SEO — BoostGG

## Diagnóstico inicial confirmado

- O relatório interno disponível foi gerado em **04/08/2026**; portanto, não prova o estado atual. Naquela execução havia **0 bloqueantes, 0 atenções e 506 notas**.
- Todos os scanners SEO armazenados estão **desatualizados** em relação ao código atual. O único achado ainda marcado como falha — a landing “seguidores por 1 real” — já possui rota, metadata, canonical, JSON-LD e entrada no sitemap, mas precisa de nova varredura para validação oficial.
- Existe uma contradição objetiva: `/rastrear` aparece no sitemap como indexável, mas está bloqueada no `robots.txt`. Isso desperdiça crawl budget e exige decidir uma única política técnica com base no propósito da página.
- O sitemap já segue a política correta de `lastmod`: não publica datas artificiais de build.
- `/trafego` continua no sitemap apesar de o próprio código declarar que a categoria Brasil foi retirada e manter a lista estática de planos vazia; a auditoria deve provar se a página ainda oferece catálogo real antes de mantê-la indexável.

## Execução

### 1. Medir o sistema antes de corrigir

- Rodar o auditor canônico do projeto e registrar o relatório atualizado.
- Executar checagem de tipos, suíte completa de testes e lint, separando falha real de dívida estética já conhecida.
- Rodar varreduras de segurança/dependências e consultar saúde do banco, linter, consultas lentas e erros operacionais recentes.
- Inspecionar os fluxos críticos sem executar pagamento ou despacho real: checkout, Mercado Pago, webhook, contingência, ledger, claim/commit de despacho, fornecedores, cron, canary, Telegram e admin.

### 2. Auditoria SEO técnica completa

- Iniciar uma nova revisão SEO para substituir os scanners vencidos.
- Comparar todas as rotas públicas geradas com sitemap, `robots.txt`, canonicals e `noindex`; eliminar páginas órfãs, duplicadas, privadas ou contraditórias.
- Verificar cada rota de conteúdo quanto a title, description, `og:*`, Twitter Card, canonical autorreferente, H1 único, alt text e JSON-LD adequado.
- Testar respostas reais de home, landings, blog, `robots.txt`, `sitemap.xml` e redirecionamentos entre domínio apex e `www`, em desktop e mobile.
- Validar links internos de landings e blog, além de coerência entre sitemap, `RelatedLinks`, navegação e `llms.txt`.
- Auditar promessas, preços e prazos das páginas SEO contra catálogo e regras reais; remover ou tornar dinâmica qualquer afirmação sem lastro.

### 3. Search Console e indexação real

- Usar a conexão existente do Google Search Console para listar propriedades verificadas e selecionar somente a que cobre `https://www.boostgg.com.br`.
- Ler status do sitemap, desempenho recente e inspeção das URLs prioritárias, distinguindo claramente dados do Google de hipóteses de código.
- Priorizar: home, `/comprar-seguidores-instagram`, `/comprar-seguidores-1-real`, ferramentas e URLs com queda, exclusão ou canonical divergente.
- Não alegar indexação, ranking ou correção concluída sem evidência atual do Google.

### 4. Corrigir por causa raiz

- Corrigir automaticamente falhas técnicas sem mudança de regra de negócio.
- Resolver a contradição de `/rastrear` conforme a política já declarada no projeto: por conter consulta individual e não ser página de aquisição, retirar do sitemap e adicionar `noindex,nofollow`, preservando a funcionalidade e o bloqueio no robots.
- Retirar `/trafego` do índice se a leitura real confirmar ausência de oferta vendável; se houver catálogo válido, manter a rota e remover apenas a inconsistência comprovada.
- Confirmar a landing de R$1 como resposta honesta à intenção de busca, sem criar SKU fictício nem alterar preço; corrigir qualquer preço estático divergente do catálogo.
- Marcar achados SEO como corrigidos somente após cada correção estar completa; achados compostos parcialmente tratados permanecem abertos.

### 5. Regressão e fechamento

- Reexecutar auditor, tipos, testes, lint e scans afetados.
- Validar no navegador as rotas alteradas e comparar HTML renderizado, metadata, canonical, robots e sitemap.
- Confirmar que nenhuma correção toca em autoridade de preço, cobrança, ledger, idempotência, despacho ou RLS sem necessidade comprovada.
- Entregar quadro final em quatro grupos: **corrigido**, **com evidência saudável**, **risco residual** e **ação externa/pós-publicação**.

## Portões de saída

O sistema só recebe sinal verde quando:

1. não houver bloqueante no auditor, tipos, testes ou segurança;
2. sitemap, robots, canonical e noindex não se contradisserem;
3. rotas indexáveis responderem com conteúdo SSR real e metadata própria;
4. preços e promessas SEO tiverem lastro no catálogo atual;
5. Search Console e o novo scan forem reportados como evidência externa, sem confundir “corrigido no código” com “já recrawleado pelo Google”.

## Limites de segurança

- Nenhuma nova rota será criada nesta auditoria.
- Nenhum pagamento, pedido ou despacho real será disparado automaticamente.
- Nenhuma alteração de preço, margem, fornecedor ou regra comercial será feita sem causa comprovada e teste de regressão.
- Correções que dependam do site publicado serão identificadas explicitamente como **precisa publicar**.
