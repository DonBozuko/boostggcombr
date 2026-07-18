// FAQ único por rede — conteúdo diferenciado para Google não classificar como thin/duplicate.
export type FaqItem = { q: string; a: string };

export const FAQS: Record<string, FaqItem[]> = {
  instagram: [
    { q: "Seguidores de Instagram caem depois de alguns dias?", a: "Nossos planos incluem reposição gratuita por 30 dias. Se houver queda, repomos sem custo. A entrega é gradual para minimizar drops." },
    { q: "Em quanto tempo os seguidores começam a entrar?", a: "A entrega inicia em até 5 minutos após a confirmação do Pix. A velocidade é gradual (500-2000/dia) para simular crescimento orgânico e evitar bloqueios do Instagram." },
    { q: "Posso comprar seguidores para conta privada?", a: "Não. O perfil precisa estar público durante a entrega. Após concluída, você pode voltar para privado normalmente." },
    { q: "É seguro? Minha conta pode ser banida?", a: "Sim, é seguro. Não pedimos senha e usamos apenas o @ do perfil. Nunca tivemos relato de banimento em mais de 3.100 pedidos." },
    { q: "Vocês emitem nota fiscal?", a: "Emitimos NF-e para pedidos empresariais. Basta solicitar pelo WhatsApp após o pagamento com CNPJ e dados de faturamento." },
  ],
  tiktok: [
    { q: "Seguidores de TikTok são reais ou bots?", a: "Entregamos seguidores com perfis brasileiros para prova social. Não são bots vazios, mas também não garantimos interação orgânica." },
    { q: "Comprar views atrapalha o algoritmo do TikTok?", a: "Pelo contrário — views iniciais aceleram a distribuição na For You Page. O algoritmo prioriza vídeos com tração precoce nas primeiras 2 horas." },
    { q: "Consigo comprar curtidas para um vídeo específico?", a: "Sim. Basta colar o link do vídeo no checkout. As curtidas caem apenas naquele vídeo, sem afetar os outros do perfil." },
    { q: "Qual a diferença entre views brasileiras e globais?", a: "Views globais entregam em minutos e custam menos. Views BR são mais lentas mas melhoram o CTR local se seu público é Brasil. Para viralizar, globais bastam." },
    { q: "Posso pedir seguidores para conta nova (menos de 1 semana)?", a: "Sim, mas recomendamos aguardar 3-5 posts publicados antes. Isso dá contexto ao algoritmo e o crescimento parece mais natural." },
  ],
  youtube: [
    { q: "Inscritos comprados contam para monetização (1.000 subs)?", a: "Contam no número exibido, mas o YouTube exige 4.000 horas de watch time reais nos últimos 12 meses. Inscritos ajudam no threshold visual; horas você precisa gerar com conteúdo." },
    { q: "Views compradas contam para as 4.000 horas?", a: "Views comuns não contam. Se você precisa de watch time real, escolha o plano de views longas (>50% de retenção) — essas contribuem parcialmente." },
    { q: "Posso comprar likes para um vídeo antigo?", a: "Sim. Como TikTok, basta o link do vídeo. Likes em vídeos antigos ajudam a reativá-los no algoritmo de sugestões." },
    { q: "YouTube deleta inscritos comprados?", a: "Purgas do YouTube atingem contas fake evidentes. Nossos inscritos vêm de contas com atividade — a taxa histórica de queda pós-purga é inferior a 5%." },
    { q: "Vale mais comprar inscritos ou views?", a: "Views. Elas movem o algoritmo e trazem inscritos orgânicos. Inscritos comprados são mais para prova social visual." },
  ],
  facebook: [
    { q: "Curtidas em página de Facebook ainda importam em 2026?", a: "Menos que antes, mas ainda pesam em decisões de compra B2B e credibilidade local. Para negócio físico e prestador de serviço, uma página com 5k+ curtidas converte melhor." },
    { q: "Posso comprar seguidores para perfil pessoal (não página)?", a: "Sim, temos plano específico para perfil. Perfil pessoal usa o botão 'Seguir', diferente de curtidas em fanpage." },
    { q: "Curtidas caem depois?", a: "Facebook faz limpezas menos agressivas que Instagram. Reposição garantida por 30 dias em qualquer queda acima de 5%." },
    { q: "Consigo alcance orgânico maior comprando curtidas?", a: "Curtidas não aumentam alcance direto (Facebook cobra por reach hoje), mas melhoram a prova social e a taxa de conversão do público que já chega na página." },
    { q: "Aceita pagamento via boleto ou cartão?", a: "Trabalhamos exclusivamente com Pix instantâneo — libera a entrega em segundos e evita chargeback." },
  ],
  telegram: [
    { q: "Membros de Telegram entram no meu canal ou grupo?", a: "Ambos. No checkout você cola o link (t.me/seucanal) ou o @username. Funciona para canais broadcast e grupos abertos." },
    { q: "Membros comprados escrevem no grupo?", a: "Não. São membros silenciosos para prova social. Se você precisa de interação real, combine com um plano de mensagens." },
    { q: "Meu canal é privado, funciona?", a: "Sim, se você gerar um link de convite público (t.me/+xxx). Não conseguimos entrar em canais totalmente fechados sem convite." },
    { q: "Telegram bane canal por comprar membros?", a: "Não. O Telegram não tem política ativa contra crescimento pago como Instagram. É a rede mais permissiva do mercado." },
    { q: "Consigo membros brasileiros especificamente?", a: "Sim, temos plano BR (mais caro, entrega mais lenta). Recomendado se seu canal for de nicho local (política, futebol, cripto BR)." },
  ],
  trafego: [
    { q: "Isso é tráfego real ou só bots contando view?", a: "Trabalhamos com duas modalidades: tráfego direto (rápido, para pump de números) e tráfego orgânico via redes sociais e busca (mais lento, gera cliques com sessão real)." },
    { q: "Google Analytics vai registrar essas visitas?", a: "Sim no tráfego orgânico. O direto é IP-based e pode ser filtrado pelo GA como bot. Se seu KPI é GA, escolha o plano orgânico." },
    { q: "Consigo escolher país de origem do tráfego?", a: "Sim: Brasil, EUA, Europa ou global. Preços variam. Brasil é mais caro por escassez de IPs residenciais BR." },
    { q: "Tráfego pago dispara flag no AdSense?", a: "Não injetamos cliques em anúncios. O tráfego navega o site normalmente. Não recomendamos combinar com AdSense se seu objetivo é monetizar via ads." },
    { q: "Em quanto tempo entrega 10.000 visitas?", a: "Direto: 24-48h. Orgânico: 5-10 dias. A distribuição é escalonada para não gerar picos suspeitos no seu servidor ou analytics." },
  ],
};

export function FaqSection({ network }: { network: keyof typeof FAQS }) {
  const items = FAQS[network];
  if (!items) return null;
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
        Perguntas Frequentes
      </h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-white font-medium">
              <span>{item.q}</span>
              <span className="text-cyan-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
