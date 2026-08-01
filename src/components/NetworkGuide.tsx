// v398 — Ciclo 3 (conteúdo): guia editorial renderizado no SSR nas landings de rede.
// Objetivo: sair de página magra (~360 palavras) para conteúdo real e único por rede,
// com links internos contextuais. Não altera preço, checkout nem regra de negócio.

type GuideLink = { href: string; label: string };
type GuideSection = { h2: string; paragraphs: string[]; bullets?: string[] };
type Guide = { intro: string; sections: GuideSection[]; links: GuideLink[] };

export const NETWORK_GUIDES: Record<string, Guide> = {
  tiktok: {
    intro:
      "O TikTok é a rede que mais recompensa tração inicial. Nas primeiras duas horas, o algoritmo testa o vídeo em um grupo pequeno e decide se amplia ou não. É por isso que views e curtidas compradas logo após a publicação costumam render mais do que o mesmo investimento feito dias depois.",
    sections: [
      {
        h2: "Como funciona a entrega no TikTok",
        paragraphs: [
          "Você escolhe o pacote, informa o @ do perfil (para seguidores) ou o link do vídeo (para curtidas e views) e paga com Pix. A entrega começa em poucos minutos após a confirmação do pagamento e segue de forma gradual, para não gerar picos artificiais no perfil.",
          "Nunca pedimos senha, código de verificação ou acesso à conta. Todo o processo usa apenas dados públicos: o @ ou a URL do conteúdo.",
        ],
        bullets: [
          "Seguidores: informe apenas o @ do perfil, que precisa estar público durante a entrega.",
          "Curtidas e views: cole o link completo do vídeo — o reforço vai só naquele post.",
          "Pacotes com selo 🇧🇷 entregam perfis brasileiros; os 🌎 são globais, mais rápidos e mais baratos.",
        ],
      },
      {
        h2: "Views, curtidas ou seguidores: por onde começar",
        paragraphs: [
          "Se o objetivo é viralizar um vídeo específico, comece por views — é o sinal que mais influencia a distribuição no For You. Se o objetivo é credibilidade de perfil (parcerias, bio, primeira impressão), seguidores fazem mais efeito. Curtidas funcionam como reforço: ajudam a manter a taxa de engajamento saudável quando as views sobem.",
          "Uma combinação comum entre criadores: views no vídeo que já está performando melhor e seguidores no perfil, para converter quem chega pelo vídeo.",
        ],
      },
      {
        h2: "O que esperar (e o que não prometemos)",
        paragraphs: [
          "Crescimento pago é empurrão, não substituto de conteúdo. Os números entram de verdade e ficam visíveis no perfil, mas não garantimos comentários, salvamentos ou vendas — isso depende do que você publica. Nos pacotes brasileiros com garantia ativa há reposição em caso de queda; nos globais, pedimos reposição ao fornecedor e resolvemos caso a caso quando não há garantia.",
        ],
      },
    ],
    links: [
      { href: "/comprar-seguidores-tiktok", label: "Comprar seguidores no TikTok" },
      { href: "/comprar-visualizacoes-tiktok", label: "Comprar visualizações no TikTok" },
      { href: "/turbinar-tiktok", label: "Turbinar TikTok: estratégia completa" },
      { href: "/ferramentas/contador-seguidores", label: "Contador de seguidores grátis" },
    ],
  },

  youtube: {
    intro:
      "No YouTube, o número que move o canal é retenção — quanto tempo as pessoas assistem. Inscritos e likes ajudam na prova social e na decisão de clique, mas quem decide se o vídeo é sugerido é o comportamento de quem assiste. Por isso separamos claramente o que cada pacote entrega.",
    sections: [
      {
        h2: "Inscritos, views e likes: o papel de cada um",
        paragraphs: [
          "Inscritos elevam a credibilidade do canal e ajudam quem chega pela primeira vez a decidir seguir. Views aquecem o vídeo e aumentam a chance de aparecer em sugestões. Likes melhoram a proporção de aprovação, que influencia a exibição na página inicial.",
          "Sobre monetização: os inscritos contam no número exibido, mas o YouTube exige 4.000 horas públicas de exibição nos últimos 12 meses. Nenhum pacote substitui watch time real — quem promete isso está mentindo.",
        ],
        bullets: [
          "Canal novo: comece por inscritos para não ficar com contagem vazia na bio.",
          "Vídeo específico: views e likes, colando o link do vídeo no checkout.",
          "Canal em crescimento: alterne reforço de views entre os vídeos que já performam.",
        ],
      },
      {
        h2: "Entrega gradual e segurança do canal",
        paragraphs: [
          "A entrega é distribuída ao longo de horas ou dias, conforme o tamanho do pacote. Isso evita o salto brusco que chama atenção nas limpezas periódicas da plataforma. Não pedimos login, senha nem acesso ao Studio: só o link do canal ou do vídeo.",
          "Se você planeja enviar um vídeo importante, faça o pedido depois da publicação, não antes — o reforço tem mais efeito quando o vídeo já está no ar e recebendo tráfego.",
        ],
      },
      {
        h2: "Pagamento e prazos",
        paragraphs: [
          "O Pix libera a entrega em minutos e é a forma mais barata. Cartão de crédito está disponível com acréscimo referente à taxa da operadora. O prazo de conclusão varia por pacote e aparece no card antes de você pagar — a gente prefere prometer menos e entregar dentro do combinado.",
        ],
      },
    ],
    links: [
      { href: "/comprar-inscritos-youtube", label: "Comprar inscritos no YouTube" },
      { href: "/crescer-youtube", label: "Como crescer no YouTube" },
      { href: "/ferramentas/contador-inscritos-youtube", label: "Contador de inscritos grátis" },
      { href: "/rastrear", label: "Acompanhar meu pedido" },
    ],
  },

  facebook: {
    intro:
      "Facebook segue sendo decisivo para negócio local, prestador de serviço e venda B2B. Quem procura uma empresa costuma abrir a página antes de chamar no WhatsApp — e uma página com poucas curtidas gera dúvida. É esse ponto que os pacotes desta página atacam.",
    sections: [
      {
        h2: "Página, perfil ou publicação",
        paragraphs: [
          "São coisas diferentes e o checkout trata cada uma separadamente. Curtidas de fanpage aumentam o número exibido na página do negócio. Seguidores de perfil pessoal usam o botão 'Seguir'. Curtidas de publicação vão apenas no post que você indicar pelo link.",
          "Se você não tem certeza de qual precisa, olhe o que aparece para quem visita: se o botão é 'Curtir página', escolha curtidas de página.",
        ],
        bullets: [
          "Fanpage: cole o link completo da página.",
          "Perfil pessoal: cole o link do perfil, que precisa aceitar seguidores.",
          "Publicação: cole o link direto do post público.",
        ],
      },
      {
        h2: "Curtidas não compram alcance — compram confiança",
        paragraphs: [
          "É importante deixar claro: o Facebook cobra por alcance hoje. Curtidas não fazem sua publicação chegar a mais gente por si só. O que elas fazem é melhorar a conversão de quem já chega — anúncio, indicação, busca no Google ou cartão de visita.",
          "Para negócio local, a combinação que funciona é página com prova social decente, informações completas (endereço, telefone, horário) e resposta rápida no inbox.",
        ],
      },
      {
        h2: "Estabilidade e reposição",
        paragraphs: [
          "As limpezas do Facebook são menos agressivas que as do Instagram, então a queda costuma ser baixa. Todos os pacotes desta página são da linha global. Se houver queda relevante, solicitamos reposição ao fornecedor; quando o serviço não tem garantia, resolvemos caso a caso no WhatsApp com reenvio ou estorno.",
        ],
      },
    ],
    links: [
      { href: "/comprar-seguidores-brasileiros", label: "Seguidores brasileiros" },
      { href: "/trafego", label: "Tráfego para site e link" },
      { href: "/avaliacoes", label: "Avaliações de clientes" },
      { href: "/rastrear", label: "Acompanhar meu pedido" },
    ],
  },

  telegram: {
    intro:
      "Telegram é a rede mais permissiva para crescimento pago: não existe política ativa contra aumento de membros como no Instagram. Por isso é o canal preferido de quem monta comunidade, lista de avisos e grupo de vendas — e onde o número de membros pesa muito na decisão de entrar.",
    sections: [
      {
        h2: "Canal, grupo e link de convite",
        paragraphs: [
          "Funciona tanto para canal broadcast quanto para grupo. No checkout você informa o @username público (t.me/seucanal) ou um link de convite (t.me/+...). Canais totalmente fechados, sem link de convite válido, não conseguem receber entrega.",
          "Confira antes de pedir se o link abre para alguém que não é membro — esse é o motivo mais comum de pedido travado nesta rede.",
        ],
        bullets: [
          "Canal público: informe o @username.",
          "Grupo ou canal privado: gere um link de convite ativo e sem limite de usos.",
          "Não altere o link durante a entrega, ou o envio é interrompido.",
        ],
      },
      {
        h2: "Membros silenciosos: o que isso significa",
        paragraphs: [
          "Os membros entregues entram e permanecem no canal, mas não escrevem mensagens nem reagem. A função deles é prova social: um canal com 5.000 membros converte melhor quem chega por indicação do que um canal com 40.",
          "Se o seu objetivo é movimento real no grupo, o caminho é conteúdo e rotina de postagem — o pacote só resolve a primeira impressão.",
        ],
      },
      {
        h2: "Prazo, origem e pagamento",
        paragraphs: [
          "Todos os pacotes desta rede são da linha global, com alto volume e entrega rápida. O prazo estimado aparece em cada card antes do pagamento. O Pix confirma em segundos e a entrega começa logo em seguida; cartão está disponível com o acréscimo da taxa da operadora.",
        ],
      },
    ],
    links: [
      { href: "/painel-smm", label: "Painel SMM completo" },
      { href: "/trafego", label: "Tráfego para site e link" },
      { href: "/rastrear", label: "Acompanhar meu pedido" },
      { href: "/avaliacoes", label: "Avaliações de clientes" },
    ],
  },

  kwai: {
    intro:
      "O Kwai concentra um público brasileiro fora dos grandes centros e ainda tem menos criadores disputando espaço do que TikTok e Instagram. Isso significa custo por alcance menor — e é por isso que perfis novos conseguem tração no Kwai mais rápido do que nas outras redes.",
    sections: [
      {
        h2: "Por que o Kwai ainda vale a pena",
        paragraphs: [
          "Concorrência menor por visualização, público fiel e um programa de recompensas que valoriza quem posta com constância. Para quem já produz vídeo curto, republicar no Kwai é aproveitar o mesmo conteúdo em uma vitrine adicional.",
          "Seguidores e curtidas ajudam o perfil a parecer estabelecido — o que aumenta a taxa de quem assiste um vídeo e decide seguir.",
        ],
        bullets: [
          "Seguidores: informe o @ ou o link do perfil público.",
          "Curtidas e views: cole o link do vídeo específico.",
          "Poste com frequência: o algoritmo do Kwai premia constância mais que volume.",
        ],
      },
      {
        h2: "Como fazemos a entrega",
        paragraphs: [
          "Após o Pix ser confirmado, o pedido entra na fila e a entrega começa em minutos, de forma gradual. Não solicitamos senha em nenhum momento. Você pode acompanhar o andamento pela página de rastreio usando o código do pedido enviado por e-mail.",
        ],
      },
      {
        h2: "Transparência sobre origem e reposição",
        paragraphs: [
          "Cada card mostra o selo de origem: 🇧🇷 para perfis brasileiros e 🌎 para global. Pacotes com garantia ativa têm reposição em caso de queda dentro do prazo indicado. Quando não há garantia do fornecedor, avaliamos reenvio ou estorno pelo WhatsApp — preferimos resolver do que fingir que não aconteceu.",
        ],
      },
    ],
    links: [
      { href: "/comprar-seguidores-kwai", label: "Comprar seguidores no Kwai" },
      { href: "/audiencia-brasileira", label: "Audiência brasileira" },
      { href: "/rastrear", label: "Acompanhar meu pedido" },
      { href: "/ferramentas", label: "Ferramentas grátis" },
    ],
  },

  trafego: {
    intro:
      "Tráfego é útil quando você já tem um destino que converte: uma página de vendas, um link na bio, um site institucional. Ele aquece o link, alimenta métricas de visita e ajuda quem está começando a não exibir um contador zerado. O que ele não faz é substituir público qualificado — e a gente diz isso antes de você pagar.",
    sections: [
      {
        h2: "Para que serve (e para que não serve)",
        paragraphs: [
          "Serve para provar movimento em uma página nova, testar se a estrutura do site aguenta acessos simultâneos e reforçar métricas de visita em campanhas de prova social. Não serve para gerar vendas diretas, cadastros reais ou leads qualificados — visita comprada não tem intenção de compra.",
          "Se o seu objetivo é venda, o caminho mais honesto é conteúdo, busca orgânica e reforço nas redes onde seu público já está.",
        ],
        bullets: [
          "Cole o link completo, com https://, do destino que vai receber as visitas.",
          "Confirme que a página está no ar e sem bloqueio de país antes de pedir.",
          "Distribua o volume ao longo de dias em vez de concentrar tudo de uma vez.",
        ],
      },
      {
        h2: "Como o volume é distribuído",
        paragraphs: [
          "A entrega é gradual por padrão. Um pacote grande concentrado em minutos gera um pico que qualquer ferramenta de análise identifica como anormal — e ainda pode derrubar um site em hospedagem simples. Por isso espalhamos o envio ao longo do prazo indicado no card.",
        ],
      },
      {
        h2: "Acompanhamento e suporte",
        paragraphs: [
          "Depois do pagamento você recebe o código do pedido por e-mail e pode acompanhar o andamento na página de rastreio. Se algo travar, o próprio sistema detecta e reprocessa; quando não é possível concluir, o suporte resolve pelo WhatsApp.",
        ],
      },
    ],
    links: [
      { href: "/painel-smm", label: "Painel SMM completo" },
      { href: "/rastrear", label: "Acompanhar meu pedido" },
      { href: "/ferramentas", label: "Ferramentas grátis" },
      { href: "/avaliacoes", label: "Avaliações de clientes" },
    ],
  },
};

export function NetworkGuide({ network, accent }: { network: keyof typeof NETWORK_GUIDES | string; accent: string }) {
  const guide = NETWORK_GUIDES[network];
  if (!guide) return null;

  return (
    <section className="px-4 py-10 max-w-3xl mx-auto text-zinc-300">
      <p className="text-sm sm:text-base leading-relaxed text-zinc-300">{guide.intro}</p>

      {guide.sections.map((s) => (
        <div key={s.h2} className="mt-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{s.h2}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-zinc-400 mb-3">
              {p}
            </p>
          ))}
          {s.bullets && (
            <ul className="mt-2 space-y-2">
              {s.bullets.map((b, i) => (
                <li key={i} className="text-sm text-zinc-400 flex gap-2">
                  <span style={{ color: accent }}>•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <nav className="mt-8" aria-label="Páginas relacionadas">
        <h2 className="text-lg font-bold text-white mb-3">Continue por aqui</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {guide.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
              style={{ background: "#111", border: `1px solid ${accent}44` }}
            >
              {l.label} →
            </a>
          ))}
        </div>
      </nav>
    </section>
  );
}
