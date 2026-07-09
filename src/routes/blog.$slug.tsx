import { createFileRoute, notFound } from "@tanstack/react-router";
import { BlogLayout } from "@/components/BlogLayout";

const BASE = "https://boostgg.com.br";

type Post = {
  title: string;
  description: string;
  subtitle: string;
  datePublished: string;
  body: React.ReactNode;
};

const POSTS: Record<string, Post> = {
  "como-ganhar-seguidores-instagram": {
    title: "Como Ganhar Seguidores no Instagram em 2026",
    description:
      "Guia direto com estratégias reais para crescer no Instagram em 2026: conteúdo, algoritmo, colaborações e quando faz sentido acelerar com serviços pagos.",
    subtitle:
      "Estratégias práticas para ganhar seguidores reais — sem promessas vazias.",
    datePublished: "2026-01-15",
    body: (
      <>
        <p>
          Ganhar seguidores no Instagram em 2026 é mais difícil do que era há
          três anos. O algoritmo prioriza <strong>tempo de retenção</strong>,
          Reels de alta performance e engajamento nos primeiros 30 minutos após
          a publicação. Táticas antigas como hashtags genéricas ou follow/unfollow
          simplesmente não movem mais o ponteiro.
        </p>

        <h2>1. Conteúdo que segura o dedo</h2>
        <p>
          O único sinal que o algoritmo realmente premia é retenção. Um Reel de
          15 segundos assistido inteiro vale mais do que um de 60 segundos
          abandonado no meio. Corte a introdução — comece já entregando o
          gancho.
        </p>

        <h2>2. Frequência importa mais do que perfeição</h2>
        <p>
          Perfis que postam 4–5 Reels por semana crescem consistentemente mais
          do que quem posta 1 vídeo "perfeito" por mês. Volume ensina o
          algoritmo a distribuir seu conteúdo.
        </p>

        <h2>3. Colaborações e menções</h2>
        <p>
          Usar a função <em>Colab</em> com perfis de tamanho parecido
          multiplica alcance sem custo. Melhor que qualquer hashtag.
        </p>

        <h2>4. Quando faz sentido acelerar</h2>
        <p>
          Um perfil com 200 seguidores enfrenta um problema de prova social:
          marcas e visitantes tendem a não seguir contas com número muito
          baixo. Nesses casos, um <strong>impulso inicial</strong> de
          seguidores reais reduz o atrito de conversão. Não substitui
          conteúdo — acelera o efeito dele.
        </p>

        <h2>5. O que evitar</h2>
        <ul>
          <li>Bots que geram seguidores fake com foto de perfil vazia</li>
          <li>Serviços que pedem sua senha (nunca entregue)</li>
          <li>Comprar engajamento em posts de forma exagerada e não realista</li>
        </ul>
      </>
    ),
  },
  "e-seguro-comprar-seguidores": {
    title: "É Seguro Comprar Seguidores no Instagram?",
    description:
      "Análise honesta: quando comprar seguidores é seguro, quando não é, e como distinguir serviços sérios de serviços que travam sua conta.",
    subtitle:
      "O que diferencia um serviço sério de um serviço que arrisca sua conta.",
    datePublished: "2026-01-20",
    body: (
      <>
        <p>
          A resposta curta: <strong>depende do serviço</strong>. Comprar
          seguidores em si não viola nenhuma lei nem derruba contas
          automaticamente. O que causa problema é o tipo de seguidor que você
          recebe e o método de entrega.
        </p>

        <h2>O que o Instagram realmente detecta</h2>
        <p>
          A Meta detecta padrões automatizados: milhares de follows em
          segundos, perfis criados no mesmo dia seguindo em massa, contas sem
          foto e sem histórico. Isso gera limpeza automática — os seguidores
          somem em 48h e, em casos extremos, a conta recebe um aviso.
        </p>

        <h2>Sinais de um serviço seguro</h2>
        <ul>
          <li>Entrega gradual (não 5.000 em 10 minutos)</li>
          <li>Perfis com foto, biografia e posts próprios</li>
          <li>Nunca pede sua senha — só o @ público</li>
          <li>Garantia de reposição se algum seguidor cair</li>
          <li>Pagamento via Pix identificado, com CNPJ ou canal de suporte real</li>
        </ul>

        <h2>Sinais de risco</h2>
        <ul>
          <li>Preço muito abaixo do mercado (1.000 seguidores por R$ 5)</li>
          <li>Pede login e senha do Instagram</li>
          <li>Promete "seguidores 100% brasileiros ativos" por preço de bot</li>
          <li>Sem canal de contato pós-compra</li>
        </ul>

        <h2>Conclusão prática</h2>
        <p>
          Comprar seguidores <strong>reais e entregues gradualmente</strong> é
          seguro — é apenas um empurrão de prova social. O que não é seguro é
          usar serviços que entregam bots ou pedem sua senha. Verifique o
          método antes de pagar.
        </p>
      </>
    ),
  },
  "melhor-site-comprar-seguidores": {
    title: "Melhor Site Para Comprar Seguidores: 5 Critérios Que Importam",
    description:
      "Como escolher onde comprar seguidores sem perder dinheiro: 5 critérios objetivos para avaliar qualquer serviço antes de pagar.",
    subtitle: "Cinco critérios objetivos que separam serviço sério de furada.",
    datePublished: "2026-01-25",
    body: (
      <>
        <p>
          Uma busca por "comprar seguidores" retorna centenas de sites, e a
          maioria é reciclagem do mesmo checkout barato. Use esta lista para
          filtrar rapidamente.
        </p>

        <h2>1. Não pede senha</h2>
        <p>
          Regra número um. Qualquer serviço legítimo trabalha apenas com o @
          público do perfil. Se pediram sua senha, feche a aba.
        </p>

        <h2>2. Entrega gradual</h2>
        <p>
          1.000 seguidores em 10 minutos é bandeira vermelha para o algoritmo
          da Meta. Serviços sérios entregam ao longo de 24–72h, imitando
          crescimento orgânico.
        </p>

        <h2>3. Perfis com aparência real</h2>
        <p>
          Peça uma amostra ou verifique reviews que mostrem o tipo de perfil
          entregue. Fotos, biografias e posts próprios importam.
        </p>

        <h2>4. Garantia de reposição</h2>
        <p>
          Alguma perda é natural. Um serviço sério repõe seguidores que caírem
          nos primeiros 30 dias, sem cobrança extra.
        </p>

        <h2>5. Pagamento identificável</h2>
        <p>
          Pix com CNPJ ou nome real, cartão via gateway conhecido, canal de
          atendimento pós-venda ativo (WhatsApp real). Fuja de sites que só
          aceitam cripto anônima ou boleto sem identificação.
        </p>

        <h2>Checklist final</h2>
        <p>
          Antes de pagar, confirme: (1) não pede senha, (2) entrega gradual,
          (3) mostra amostras, (4) tem garantia, (5) pagamento
          rastreável. Se falha em qualquer um, procure outro.
        </p>
      </>
    ),
  },
  "comprar-seguidores-pix": {
    title: "Comprar Seguidores no Pix: Como Funciona e Por Que É a Forma Mais Segura",
    description:
      "Comprar seguidores Instagram no Pix é mais rápido, rastreável e barato que cartão. Entenda como funciona a entrega automática e o que verificar antes de pagar.",
    subtitle:
      "Por que o Pix virou o método padrão para comprar seguidores reais.",
    datePublished: "2026-02-01",
    body: (
      <>
        <p>
          Comprar seguidores no <strong>Pix</strong> deixou de ser exceção e
          virou o padrão no Brasil. O motivo é simples: é o único método
          instantâneo, rastreável e sem chargeback fraudulento. Para quem
          vende seguidores, isso permite entregar em minutos. Para quem
          compra, elimina o risco de cartão clonado e de espera de 3 dias
          úteis do boleto.
        </p>
        <h2>Como funciona a entrega no Pix</h2>
        <p>
          Você escolhe o pacote, informa apenas o <em>@ público</em> (nunca
          senha), paga o Pix e a fila é acionada automaticamente. Os
          seguidores começam a entrar em minutos e são distribuídos de forma
          gradual para o Instagram entender como crescimento orgânico.
        </p>
        <h2>Por que Pix é mais seguro que cartão</h2>
        <ul>
          <li>Sem dados de cartão salvos em servidor</li>
          <li>Confirmação imediata — sem período de "pendente"</li>
          <li>Comprovante rastreável com CPF/CNPJ do recebedor</li>
          <li>Sem taxa de intermediador repassada no preço</li>
        </ul>
        <h2>O que verificar antes de pagar o Pix</h2>
        <p>
          Confira se o QR Code mostra <strong>CNPJ do recebedor</strong> (não
          CPF genérico) e se o site tem política de reposição escrita. Se o
          serviço pedir senha do Instagram junto com o Pix, cancele — nenhum
          serviço legítimo precisa dela.
        </p>
        <h2>Preço justo no Pix</h2>
        <p>
          Pacotes de 1.000 seguidores reais no Brasil variam de R$ 20 a R$
          60. Abaixo disso, quase sempre é bot descartável que cai em uma
          semana. Acima, você está pagando marketing, não seguidor.
        </p>
      </>
    ),
  },
  "seguidores-instagram-baratos": {
    title: "Seguidores Instagram Baratos: Vale a Pena? O Que Observar",
    description:
      "Seguidores Instagram baratos podem ser bots descartáveis. Aprenda a diferenciar preço justo de armadilha e o que observar antes de comprar.",
    subtitle:
      "Barato demais quase sempre custa caro depois. Entenda a diferença.",
    datePublished: "2026-02-05",
    body: (
      <>
        <p>
          Procurar <strong>seguidores Instagram baratos</strong> é natural —
          ninguém quer pagar caro. Mas nesse mercado, preço baixo demais é o
          sinal mais confiável de que você vai perder o dinheiro. Este guia
          mostra onde está o piso saudável e o que observar.
        </p>
        <h2>Qual é o preço realista?</h2>
        <p>
          No Brasil, seguidores reais brasileiros custam entre{" "}
          <strong>R$ 20 e R$ 60 por 1.000</strong>. Seguidores
          internacionais mistos ficam entre R$ 8 e R$ 20. Qualquer coisa
          abaixo de R$ 5 por 1.000 é bot descartável — cai em 7 a 15 dias e
          o Instagram derruba junto.
        </p>
        <h2>Por que barato demais quebra</h2>
        <ul>
          <li>Contas geradas em massa, sem foto e sem posts</li>
          <li>Instagram detecta padrão e remove em lote</li>
          <li>Seu perfil fica marcado como "comprador de fake"</li>
          <li>Sem reposição — o serviço some depois do Pix</li>
        </ul>
        <h2>Como identificar seguidor real de bot</h2>
        <p>
          Depois da entrega, abra 5 seguidores novos aleatórios. Real tem:
          foto de perfil, bio, posts próprios, seguindo outras pessoas. Bot
          tem: nome genérico com números, sem foto, zero posts, seguindo
          milhares.
        </p>
        <h2>O barato que compensa</h2>
        <p>
          Pacotes menores (500 a 1.000) de serviços sérios costumam ter{" "}
          <strong>preço por unidade mais alto</strong>, mas com garantia de
          reposição de 30 dias e entrega gradual. Isso sim é barato — porque
          fica.
        </p>
      </>
    ),
  },
};

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = POSTS[params.slug];
    if (!post) throw notFound();
    return { post, slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Post não encontrado" }, { name: "robots", content: "noindex" }],
      };
    }
    const { post, slug } = loaderData;
    const url = `${BASE}/blog/${slug}`;
    return {
      meta: [
        { title: `${post.title} — EliteBoost Prime` },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.datePublished,
            author: { "@type": "Organization", name: "EliteBoost Prime" },
            publisher: { "@type": "Organization", name: "EliteBoost Prime" },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  component: BlogPost,
  notFoundComponent: PostNotFound,
});

function BlogPost() {
  const { post } = Route.useLoaderData();
  return (
    <BlogLayout title={post.title} subtitle={post.subtitle}>
      {post.body}
    </BlogLayout>
  );
}

function PostNotFound() {
  return (
    <BlogLayout title="Post não encontrado" subtitle="O artigo que você procura não existe ou foi movido.">
      <p>Volte para o <a href="/blog">blog</a> e escolha outro artigo.</p>
    </BlogLayout>
  );
}
