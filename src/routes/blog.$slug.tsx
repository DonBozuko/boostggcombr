import { createFileRoute, notFound } from "@tanstack/react-router";
import { BlogLayout } from "@/components/BlogLayout";

const BASE = "https://boostgg.com.br";

type Post = {
  title: string;
  seoTitle?: string;
  description: string;
  subtitle: string;
  datePublished: string;
  dateModified?: string;
  faq?: { q: string; a: string }[];
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
    seoTitle: "Melhor Site Para Comprar Seguidores: 5 Critérios",
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
    seoTitle: "Comprar Seguidores no Pix: Como Funciona",
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
  "comprar-seguidores-cai": {
    title: "Comprar Seguidores no Instagram Cai? O Que Acontece Depois",
    seoTitle: "Comprar Seguidores no Instagram Cai? Retenção e Reposição",
    description:
      "Comprar seguidores no Instagram cai depois? Entenda retenção, reposição, como identificar bots e o que esperar nos primeiros 30 dias após a compra.",
    subtitle:
      "Retenção real, reposição e os sinais que revelam se você comprou seguidores de verdade ou bots.",
    datePublished: "2026-07-20",
    body: (
      <>
        <p>
          A pergunta que mais aparece antes de pagar: <strong>comprar seguidores no Instagram cai?</strong> A resposta honesta é: <strong>alguns caem, sim</strong> — mas a quantidade e velocidade dependem do tipo de seguidor entregue. Serviços de bots descartáveis perdem 50% em uma semana. Serviços de seguidores reais brasileiros mantêm 80% a 90% após 30 dias, com reposição automática para quem oferece garantia.
        </p>

        <h2>Por que alguns seguidores somem?</h2>
        <p>
          O Instagram faz limpezas periódicas em contas que identifica como inativas, falsas ou criadas em massa. Se o serviço entregou perfis sem foto, sem bio e sem posts, essas contas são removidas em lote — e seu número de seguidores cai junto. Isso é chamado de <strong>queda natural</strong> e acontece mesmo em pequenos pacotes de bots.
        </p>

        <h2>Quanto cai em cada tipo de serviço?</h2>
        <ul>
          <li><strong>Bots baratos:</strong> 30% a 70% em 7 a 15 dias.</li>
          <li><strong>Seguidores internacionais mistos:</strong> 10% a 30% em 30 dias.</li>
          <li><strong>Seguidores brasileiros reais:</strong> 5% a 15% em 30 dias, com reposição.</li>
        </ul>
        <p>
          A diferença não é só no preço. Seguidores reais têm histórico, interagem com conteúdo e passam pelos filtros da Meta sem levar banimento em massa.
        </p>

        <h2>O que é garantia de reposição?</h2>
        <p>
          Garantia de reposição significa que, se algum seguidor cair dentro do prazo combinado — geralmente 30 dias — o serviço devolve a quantidade perdida sem custo extra. É o principal sinal de que o fornecedor confia na qualidade do que entrega. Quem vende bot descartável nunca oferece reposição de verdade.
        </p>

        <h2>Como saber se caiu seguidor real ou bot?</h2>
        <p>
          Abra 5 a 10 seguidores que entraram nos primeiros dias. Se eles têm:
        </p>
        <ul>
          <li>foto de perfil, bio e posts próprios — são reais;</li>
          <li>nome genérico, sem foto, seguindo milhares — são bots;</li>
          <li>conta criada recentemente e sem atividade — provavelmente serão removidos.</li>
        </ul>
        <p>
          Se a queda vier dos seguidores que pareciam reais, pode ser um sinal de que a entrega foi muito rápida e o Instagram interpretou como padrão artificial. A velocidade importa tanto quanto a qualidade.
        </p>

        <h2>A conta pode ser derrubada se cair muito?</h2>
        <p>
          Não. A Meta não derruba contas só porque seguidores somem. O risco existe quando o serviço usa métodos agressivos — como seguir e desseguir milhares de vezes usando sua senha, ou criar contas fake em massa apontando para você. Serviços que só pedem seu <em>@ público</em> e entregam seguidores de forma gradual não arriscam a conta.
        </p>

        <h2>O que fazer se cair demais?</h2>
        <ol>
          <li>Verifique se o serviço tem garantia de reposição escrita.</li>
          <li>Peça o reenvio ou reposição no prazo combinado.</li>
          <li>Se o fornecedor sumir, tome isso como sinal de alerta para a próxima compra.</li>
          <li>Mantenha o perfil ativo — poste Reels e Stories para segurar a retenção dos seguidores reais.</li>
        </ol>

        <h2>Conclusão</h2>
        <p>
          Comprar seguidores no Instagram <strong>cai sim, em parte</strong>, porque nenhum serviço consegue garantir 100% de retenção eterna. A questão é: cai quanto e em quanto tempo? Serviços sérios entregam seguidores brasileiros reais, com entrega gradual e reposição de 30 dias. Serviços baratos entregam bots que somem em dias. Se o objetivo é prova social duradoura, o preço justo é o que inclui reposição e atendimento real.
        </p>
        <p>
          Se você quer saber como escolher bem, leia nosso guia sobre os <a href="/blog/melhor-site-comprar-seguidores">critérios para escolher o melhor site</a> ou confira os <a href="/comprar-seguidores-brasileiros">pacotes de seguidores brasileiros com reposição</a> da BoostGG.
        </p>
      </>
    ),
  },
  "boostgg-nao-e-boost-de-jogos": {
    title: "BoostGG Não é Boost de Jogos: Entenda a Diferença",
    seoTitle: "BoostGG Não é Boost de Jogos: Entenda a Diferença",
    description:
      "BoostGG é serviço de crescimento em redes sociais, não Elo boosting ou subida de ranqueada em jogos. Entenda a diferença e por que a marca é de social media.",
    subtitle:
      "Redes sociais, não games: o que a BoostGG realmente entrega.",
    datePublished: "2026-07-21",
    body: (
      <>
        <p>
          O nome <strong>BoostGG</strong> pode confundir quem está acostumado com o termo "boost" no mundo dos games. Mas a BoostGG <strong>não vende Elo boosting, subida de ranqueada, itens, skins, contas ou coaching de jogos</strong>. A gente vende crescimento em redes sociais: seguidores, curtidas, visualizações e inscritos para Instagram, TikTok, YouTube, Facebook e Telegram.
        </p>

        <h2>O que é Elo boosting?</h2>
        <p>
          Elo boosting é um serviço de jogos em que um jogador experiente acessa a conta de outro jogador para subir seu ranking (ou "Elo") em jogos competitivos como League of Legends, Valorant, Dota 2, CS2, etc. Esse tipo de serviço é contra os termos da maioria dos jogos e pode resultar em banimento da conta.
        </p>

        <h2>O que a BoostGG entrega?</h2>
        <p>
          A BoostGG é uma plataforma de marketing de influência e crescimento social. Nossos serviços incluem:
        </p>
        <ul>
          <li>Seguidores brasileiros e reais para Instagram</li>
          <li>Curtidas e visualizações em posts e Reels</li>
          <li>Inscritos para canais no YouTube</li>
          <li>Seguidores e visualizações no TikTok</li>
          <li>Engajamento para Telegram e Facebook</li>
        </ul>
        <p>
          Não pedimos senha de nenhuma rede social. Trabalhamos apenas com o link ou @ público do perfil. Pagamento é 100% via Pix, com entrega automática e garantia de reposição de 30 dias.
        </p>

        <h2>Por que a confusão acontece?</h2>
        <p>
          "Boost" é uma palavra comum em dois mercados diferentes: games e redes sociais. Em games, significa subir de nível. Em social media, significa impulsionar o alcance, o engajamento e a prova social de um perfil. A sigla "GG" (good game) reforça a associação com games, mas na BoostGG é apenas parte da marca — a sigla não indica serviço de jogos.
        </p>

        <h2>Como escolher o serviço certo?</h2>
        <p>
          Se você quer crescer no Instagram, TikTok ou YouTube, a BoostGG é o lugar certo. Se você quer subir de rank em algum jogo, precisa de um serviço especializado em Elo boosting — e deve saber que isso é arriscado e contra as regras das plataformas de games.
        </p>

        <h2>A empresa é de confiança?</h2>
        <p>
          Sim. A BoostGG opera sob a razão social <strong>Elite Boost Prime</strong>, CNPJ 47.363.210/0001-08. O site é boostgg.com.br e o atendimento é feito por chat e WhatsApp. Não há relação com qualquer serviço de jogos, sites de skin ou contas de ranqueada.
        </p>

        <h2>Conclusão</h2>
        <p>
          BoostGG é crescimento social, não boost de jogos. Se você procura Elo boosting, não encontrará aqui. Se você quer mais seguidores, curtidas e visualizações no Instagram, TikTok ou YouTube, com entrega via Pix e suporte real, a BoostGG foi feita para isso.
        </p>
      </>
    ),
  },
  "seguidores-instagram-baratos": {
    title: "Seguidores Instagram Baratos: Vale a Pena? O Que Observar",
    seoTitle: "Seguidores Instagram Baratos: Vale a Pena?",
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
  "como-tirar-instagram-privado": {
    title: "Como Tirar o Instagram do Privado: Passo a Passo (iOS e Android)",
    seoTitle: "Como Tirar o Instagram do Privado",
    description:
      "Como tirar o Instagram do privado em 2 minutos no iPhone e Android. Guia 2026: o que muda ao virar público e por que é obrigatório para crescer.",
    subtitle:
      "Passo a passo atualizado para deixar seu perfil público — e por que isso é obrigatório antes de qualquer campanha de crescimento.",
    datePublished: "2026-03-01",
    body: (
      <>
        <p>
          Se você quer <strong>tirar o Instagram do privado</strong>, o motivo
          normalmente é um só: crescer. Perfil trancado não recebe seguidores
          novos de forma orgânica, não aparece na aba Explorar, não recebe
          entrega de campanhas pagas de seguidores e curtidas, e afasta marcas
          que pesquisam parceiros. Este guia mostra o passo a passo real,
          atualizado para 2026, no iPhone e no Android — e o que muda depois.
        </p>

        <h2>Passo a passo no iPhone (iOS)</h2>
        <ol>
          <li>Abra o app do Instagram e toque na sua foto de perfil no canto inferior direito.</li>
          <li>Toque no ícone de <strong>três linhas horizontais</strong> no canto superior direito.</li>
          <li>Selecione <strong>Configurações e atividade</strong>.</li>
          <li>Role até <strong>Quem pode ver seu conteúdo</strong> e toque em <strong>Privacidade da conta</strong>.</li>
          <li>Desative o botão <strong>Conta privada</strong>. Confirme em <em>Alterar para pública</em>.</li>
        </ol>
        <p>Pronto. O cadeado ao lado do seu @ desaparece na hora.</p>

        <h2>Passo a passo no Android</h2>
        <ol>
          <li>Abra o Instagram e toque na sua foto de perfil.</li>
          <li>Toque no menu <strong>três linhas</strong> no topo.</li>
          <li>Vá em <strong>Configurações e atividade</strong> → <strong>Privacidade da conta</strong>.</li>
          <li>Desmarque <strong>Conta privada</strong> e confirme.</li>
        </ol>

        <h2>E se eu não achar a opção "Privacidade da conta"?</h2>
        <p>
          Isso acontece em <strong>Contas Profissionais</strong> (Criador de
          Conteúdo ou Empresa). Nesse tipo de conta, o perfil já é público por
          padrão e o Instagram esconde o botão. Se você está em conta
          profissional e mesmo assim aparece cadeado, mude para conta pessoal
          temporariamente em <em>Configurações → Tipo de conta e ferramentas
          → Mudar para conta pessoal</em>, ajuste a privacidade, e depois volte
          para profissional.
        </p>

        <h2>O que muda quando o perfil vira público</h2>
        <ul>
          <li>Qualquer pessoa pode seguir sem aprovação manual.</li>
          <li>Suas fotos e Reels passam a aparecer na aba <strong>Explorar</strong>.</li>
          <li>Hashtags começam a funcionar — antes, posts de conta privada não indexavam.</li>
          <li>Você pode ativar <strong>Insights</strong> completos (só existe em perfil público).</li>
          <li>Serviços de crescimento — seguidores, curtidas, views — só entregam em perfil público.</li>
        </ul>

        <h2>Por que serviços de seguidores exigem perfil público</h2>
        <p>
          A entrega funciona assim: nossa fila envia perfis reais para seguir
          o seu @. Se o perfil está trancado, cada seguidor cai numa fila de
          <em> solicitação pendente</em> — não conta como seguidor até você
          aprovar um por um. Em pacotes de 1.000+, isso é inviável. Por isso
          todo serviço sério (BoostGG incluído) só processa pedidos de contas
          públicas. É verificação automática, não decisão comercial.
        </p>

        <h2>"Ficar público é seguro?"</h2>
        <p>
          Depende do que você posta. Se o perfil já é usado para vender,
          divulgar trabalho ou construir marca pessoal, ser público é
          requisito. Se é conta 100% pessoal com fotos de família, o correto
          é criar um <strong>segundo perfil</strong> para o negócio e manter
          o pessoal privado. Instagram permite até 5 contas logadas
          simultaneamente sem precisar deslogar.
        </p>

        <h2>O que fazer imediatamente depois de virar público</h2>
        <ol>
          <li><strong>Foto de perfil profissional</strong> — sem ela, seguidores novos não convertem.</li>
          <li><strong>Bio clara</strong> em uma frase: o que você faz e para quem.</li>
          <li><strong>Link no Bio</strong> (WhatsApp, site, Linktree) — perfil público sem CTA é audiência morta.</li>
          <li><strong>3 posts fixados</strong> mostrando seu melhor conteúdo. É a vitrine que decide quem segue.</li>
        </ol>

        <h2>Erro comum: virar público e não postar</h2>
        <p>
          Muita gente abre a conta, contrata pacote de seguidores e some. O
          algoritmo interpreta como perfil abandonado e para de distribuir.
          Regra prática: ao virar público, poste pelo menos <strong>3 Reels
          na primeira semana</strong>. Isso mantém o perfil aquecido enquanto
          os seguidores novos chegam.
        </p>

        <h2>Pronto para acelerar?</h2>
        <p>
          Com perfil público, foto boa e bio funcionando, faz sentido acelerar
          o crescimento com um impulso inicial de seguidores reais. Isso reduz
          o atrito de conversão — perfis com números baixos assustam marcas e
          visitantes. Confira nossos <a href="/comprar-seguidores-brasileiros">pacotes
          de seguidores brasileiros</a> ou volte para o <a href="/blog">blog</a> para
          mais guias práticos.
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
        { title: `${post.seoTitle ?? post.title} — BoostGG` },
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
            author: { "@type": "Organization", name: "BoostGG" },
            publisher: { "@type": "Organization", name: "BoostGG" },
            mainEntityOfPage: url,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: BASE },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
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
