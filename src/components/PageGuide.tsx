// v398 — Ciclo 3 (conteúdo): blocos editoriais para páginas de revenda/afiliados/painel.
// Usa tokens semânticos do design system. Só conteúdo — sem regra de negócio.

type Section = { h2: string; paragraphs: string[]; bullets?: string[] };
type Guide = { sections: Section[]; links: { href: string; label: string }[] };

export const PAGE_GUIDES: Record<string, Guide> = {
  "painel-smm": {
    sections: [
      {
        h2: "O que é um painel SMM, na prática",
        paragraphs: [
          "Painel SMM é a central onde você pede serviços de redes sociais — seguidores, curtidas, views, inscritos, membros — sem falar com ninguém. Você escolhe o serviço, informa o link, paga e o pedido segue automaticamente para o fornecedor que executa a entrega.",
          "A diferença entre um painel confiável e um improvisado está no que acontece quando algo falha: pedido que não despacha precisa voltar para a fila, ser reprocessado e, se não houver saída, gerar aviso e devolução. Aqui isso é automático e registrado.",
        ],
        bullets: [
          "Catálogo com preço fixo em real, sem variação de câmbio na hora do pagamento.",
          "Pagamento por Pix com confirmação em segundos e entrega iniciando logo depois.",
          "Rastreio por código do pedido, sem precisar abrir chamado para saber o andamento.",
        ],
      },
      {
        h2: "Painel para uso próprio ou para revender",
        paragraphs: [
          "Se você só quer impulsionar os seus perfis, use o catálogo normal da loja: não há mensalidade nem pedido mínimo. Se você atende clientes e faz volume, o programa de revenda dá desconto por faixa e acesso a uma chave de API para lançar pedidos direto do seu sistema.",
          "Na revenda o preço de custo é seu e a margem também: você define quanto cobra do cliente final. A calculadora de lucro ajuda a simular antes de fechar tabela.",
        ],
      },
      {
        h2: "O que checar antes de escolher um painel",
        paragraphs: [
          "Três perguntas separam painel sério de aposta: existe rastreio do pedido? existe política clara de reposição por pacote? existe canal humano quando o robô não resolve? Se a resposta a qualquer uma for não, o risco fica todo com você.",
        ],
      },
    ],
    links: [
      { href: "/revenda", label: "Programa de revenda" },
      { href: "/api-revenda", label: "Documentação da API" },
      { href: "/ferramentas/calculadora-lucro-revenda", label: "Calculadora de lucro" },
      { href: "/rastrear", label: "Acompanhar meu pedido" },
    ],
  },

  "revender-seguidores": {
    sections: [
      {
        h2: "Como funciona revender seguidores",
        paragraphs: [
          "Você compra por um preço de custo com desconto por faixa de volume e vende ao seu cliente pelo preço que quiser. A operação de entrega, reposição e reprocessamento fica com a gente; o relacionamento com o cliente final fica com você.",
          "Não existe mensalidade. O que define seu desconto é o volume mensal — quanto mais consistente, melhor a faixa.",
        ],
        bullets: [
          "Pedidos manuais pelo painel do revendedor ou automáticos pela API.",
          "Saldo pré-pago: você recarrega e cada pedido debita do saldo.",
          "Selo de origem visível por pacote, para você prometer ao cliente exatamente o que será entregue.",
        ],
      },
      {
        h2: "Quanto dá para ganhar",
        paragraphs: [
          "A margem depende da faixa de desconto e do preço que você pratica. Em vez de chutar, use a calculadora de lucro: informe o custo do pacote e o preço de venda e ela mostra a margem por pedido e o ponto em que compensa subir de faixa.",
          "Um erro comum é competir só por preço. Quem sustenta margem entrega junto o que o painel não entrega: atendimento, orientação de conteúdo e responsabilidade quando algo atrasa.",
        ],
      },
      {
        h2: "Riscos que você precisa conhecer",
        paragraphs: [
          "Serviço de rede social depende de fornecedor externo e de regras que mudam. Pacotes com garantia têm reposição no prazo indicado; pacotes globais nem sempre têm. Prometa ao cliente final apenas o que está escrito no card do pacote — é a forma mais barata de evitar estorno.",
        ],
      },
    ],
    links: [
      { href: "/revenda", label: "Solicitar acesso à revenda" },
      { href: "/api-revenda", label: "Documentação da API" },
      { href: "/ferramentas/calculadora-lucro-revenda", label: "Calculadora de lucro" },
      { href: "/painel-smm", label: "Painel SMM" },
    ],
  },

  revenda: {
    sections: [
      {
        h2: "Como funciona a aprovação",
        paragraphs: [
          "O acesso é por aprovação porque a faixa de desconto é definida caso a caso, conforme o volume que você opera. Ao enviar a solicitação a gente entende seu cenário, define a faixa e libera o painel e a chave de API.",
          "Depois da liberação você trabalha com saldo pré-pago: recarrega, lança pedidos e acompanha tudo pelo painel do revendedor, com histórico e status de cada pedido.",
        ],
        bullets: [
          "Sem mensalidade e sem taxa de adesão.",
          "Desconto por faixa de volume, revisado conforme o consumo mensal.",
          "Mesma infraestrutura de entrega, reprocessamento e rastreio da loja.",
        ],
      },
      {
        h2: "O que você recebe",
        paragraphs: [
          "Painel próprio com catálogo, saldo e histórico; chave de API para integrar ao seu sistema ou bot; e o mesmo mecanismo de reconciliação que reprocessa pedido travado sem você precisar reclamar primeiro.",
          "Você define preço, marca e forma de cobrança do seu cliente. A gente não fala com ele nem aparece na entrega.",
        ],
      },
      {
        h2: "Para quem faz sentido",
        paragraphs: [
          "Faz sentido para agência, social media, gestor de tráfego e quem já vende serviço de crescimento e hoje repassa pedido no varejo, perdendo margem. Não faz sentido para quem quer comprar uma única vez — nesse caso o catálogo normal da loja sai mais simples e sem burocracia.",
        ],
      },
    ],
    links: [
      { href: "/revender-seguidores", label: "Como revender seguidores" },
      { href: "/api-revenda", label: "Documentação da API" },
      { href: "/ferramentas/calculadora-lucro-revenda", label: "Calculadora de lucro" },
      { href: "/afiliados", label: "Programa de afiliados" },
    ],
  },

  afiliados: {
    sections: [
      {
        h2: "Afiliado ou revendedor: qual escolher",
        paragraphs: [
          "No programa de afiliados você indica e recebe comissão sobre as vendas geradas pelo seu link, sem operar pedido nem dar suporte. Na revenda você compra com desconto, define seu preço e assume o relacionamento com o cliente — margem maior, trabalho maior.",
          "Quem tem audiência e não quer operação escolhe afiliado. Quem já atende clientes e quer margem escolhe revenda.",
        ],
        bullets: [
          "Link próprio com rastreio de origem das vendas.",
          "Comissão sobre pedidos pagos e confirmados.",
          "Sem custo de entrada e sem meta obrigatória.",
        ],
      },
      {
        h2: "Como divulgar sem queimar sua audiência",
        paragraphs: [
          "Conteúdo que explica funciona melhor que anúncio genérico: mostre o antes e depois de um perfil, explique a diferença entre pacote brasileiro e global, use as ferramentas gratuitas como isca e coloque o link no fim.",
          "Evite prometer resultado que o serviço não entrega. Indicação que gera reclamação queima a sua audiência antes de queimar a nossa.",
        ],
      },
      {
        h2: "Pagamento da comissão",
        paragraphs: [
          "A comissão é apurada sobre pedidos pagos e confirmados e paga via Pix. Pedido estornado ou cancelado não gera comissão. Você acompanha o total apurado pelo painel de afiliado.",
        ],
      },
    ],
    links: [
      { href: "/revenda", label: "Programa de revenda" },
      { href: "/revender-seguidores", label: "Como revender seguidores" },
      { href: "/ferramentas", label: "Ferramentas grátis" },
      { href: "/avaliacoes", label: "Avaliações de clientes" },
    ],
  },

  "api-revenda": {
    sections: [
      {
        h2: "Antes de integrar",
        paragraphs: [
          "A API foi feita para quem lança pedidos em volume e não quer usar o painel manualmente. Você precisa de uma chave ativa, saldo disponível e o identificador do serviço que vai consumir. O identificador é estável: mudanças de fornecedor acontecem por trás sem quebrar sua integração.",
          "Recomendamos guardar o identificador do pedido retornado na criação. É com ele que você consulta status e comprova entrega ao seu cliente.",
        ],
        bullets: [
          "Sempre trate a resposta de erro: saldo insuficiente e link inválido são os casos mais comuns.",
          "Use uma chave por ambiente para conseguir revogar sem parar a operação inteira.",
          "Consulte status por polling espaçado em vez de checar a cada segundo.",
        ],
      },
      {
        h2: "Idempotência e pedidos duplicados",
        paragraphs: [
          "Timeout de rede não significa pedido perdido. Antes de reenviar a mesma requisição, consulte o pedido pelo seu identificador interno — o sistema bloqueia despacho duplicado, mas repetir chamadas sem checar polui seu histórico e dificulta a conciliação.",
        ],
      },
      {
        h2: "O que acontece quando algo falha",
        paragraphs: [
          "Pedido que não despacha na hora não é perdido: ele fica em fila e é reconciliado automaticamente em poucos minutos. Se mesmo assim não houver saída, o valor volta para o seu saldo e o status reflete isso. Nada fica em limbo silencioso.",
        ],
      },
    ],
    links: [
      { href: "/revenda", label: "Solicitar acesso à revenda" },
      { href: "/revender-seguidores", label: "Como revender seguidores" },
      { href: "/painel-smm", label: "Painel SMM" },
      { href: "/ferramentas/calculadora-lucro-revenda", label: "Calculadora de lucro" },
    ],
  },
};

export function PageGuide({ page }: { page: string }) {
  const guide = PAGE_GUIDES[page];
  if (!guide) return null;

  return (
    <section className="mt-12 border-t border-border/60 pt-8">
      {guide.sections.map((s) => (
        <div key={s.h2} className="mt-6 first:mt-0">
          <h2 className="text-lg font-bold">{s.h2}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
          {s.bullets && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {s.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <nav className="mt-8" aria-label="Páginas relacionadas">
        <h2 className="text-lg font-bold">Continue por aqui</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {guide.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm font-semibold"
            >
              {l.label} →
            </a>
          ))}
        </div>
      </nav>
    </section>
  );
}
