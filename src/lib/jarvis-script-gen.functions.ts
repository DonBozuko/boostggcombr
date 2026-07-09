import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NETWORKS = ["instagram", "tiktok", "facebook", "youtube", "telegram"] as const;
type Network = (typeof NETWORKS)[number];

const ROUTE: Record<Network, { url: string; pitch: string }> = {
  instagram: { url: "boostgg.com.br", pitch: "seguidores reais no Instagram" },
  tiktok: { url: "boostgg.com.br/tiktok", pitch: "views virais no TikTok" },
  facebook: { url: "boostgg.com.br/facebook", pitch: "curtidas blindadas no Facebook" },
  youtube: { url: "boostgg.com.br/youtube", pitch: "inscritos premium no YouTube" },
  telegram: { url: "boostgg.com.br/telegram", pitch: "membros ativos no Telegram" },
};

const HASHTAGS: Record<Network, string> = {
  instagram: "#instagram #seguidores #crescernoinsta #marketingdigital #eliteboostprime",
  tiktok: "#tiktok #viral #fyp #foryou #tiktokbrasil #eliteboostprime",
  facebook: "#facebook #marketingfb #engajamento #eliteboostprime",
  youtube: "#youtube #shorts #inscritos #criadordeconteudo #eliteboostprime",
  telegram: "#telegram #grupotelegram #canal #eliteboostprime",
};

// Matriz de 50 ganchos mentais de alta conversão SMM
const HOOKS_MATRIX = [
  "Como os grandes perfis crescem em segredo",
  "O teste de R$ 5,00 que muda seu engajamento",
  "Por que seu Reels não passa de 200 views",
  "O algoritmo pune quem não faz isso nas 24h iniciais",
  "Ninguém te contou sobre esse atalho de prova social",
  "Isso separa perfil amador de perfil pago",
  "O gatilho que criadores TOP escondem do público",
  "Se você posta e não cresce, é por causa disso",
  "O que grandes contas fazem nos primeiros 60 min de um post",
  "A verdade sobre engajamento que ninguém posta",
  "Pare de postar até ver isso",
  "O erro que trava 90% dos perfis novos",
  "Como sair de 0 para milhares em 48h sem gastar em ads",
  "Perfil travado? A culpa NÃO é do seu conteúdo",
  "Descobri por que o Reels dos outros bomba e o seu não",
  "O truque de bastidor que faz o algoritmo te empurrar",
  "Isso aqui é o que separa quem lucra de quem só posta",
  "3 segundos que decidem se seu vídeo vai viralizar",
  "O algoritmo é matemático — e essa conta muda tudo",
  "Fiz esse teste 10x e o resultado foi o mesmo",
  "A jogada que grandes players usam antes de lançar",
  "Se você ainda faz isso, seu perfil está morrendo",
  "O segredo dos perfis que vendem todo dia",
  "Isso não é dica, é atalho comprovado",
  "Descobri o gatilho oculto de crescimento acelerado",
  "Fiz meu perfil crescer sem aparecer — assim",
  "O motivo real do seu Reels não sair de 300 views",
  "Isso mudou o jogo pra mim em uma semana",
  "Ninguém fala disso porque quer manter o segredo",
  "A tática silenciosa que faz o Instagram te promover",
  "Como parar de perder tempo com conteúdo que não converte",
  "O gatilho psicológico que dobra seu alcance",
  "Descobri por acaso — e mudou tudo",
  "Se seu perfil não tem isso, o algoritmo ignora",
  "A engenharia por trás dos perfis que estouram",
  "O erro de amador que ninguém quer admitir",
  "Isso não é mágica, é matemática de algoritmo",
  "O ativo invisível de todo perfil que fatura",
  "Como fiz 10x mais alcance sem mudar meu conteúdo",
  "O detalhe que muda um post normal em um viral",
  "Está tudo errado no seu setup de crescimento",
  "Assista antes que o algoritmo mude de novo",
  "A prova social como arma de crescimento acelerado",
  "Por que perfis novos crescem mais que perfis antigos",
  "O que meu mentor de 1M+ me ensinou em 3 min",
  "A dobra silenciosa de engajamento em 24h",
  "Se você acha que é só conteúdo, tá errado",
  "O botão invisível que destrava o algoritmo",
  "Como dobrar seguidores sem mudar nada no perfil",
  "O que ninguém posta sobre crescimento real",
];

const genInput = z.object({
  network: z.enum(NETWORKS),
  format: z.enum(["1:1", "9:16"]),
});

export const generateFacelessScript = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => genInput.parse(input))
  .handler(async ({ data }) => {
    const info = ROUTE[data.network];
    const seedHook = HOOKS_MATRIX[Math.floor(Math.random() * HOOKS_MATRIX.length)];
    const apiKey = process.env.LOVABLE_API_KEY;

    // Fallback local determinístico caso não haja API key
    const localFallback = () => ({
      hook: `PARA AÍ 👀 ${seedHook.toLowerCase()}…`,
      retention: `O algoritmo recompensa quem entrega prova social nos primeiros minutos. Por isso ${info.pitch} vira o jogo: entrega blindada, sem queda, indetectável.`,
      cta: `🔗 Acessa ${info.url} agora, cupom PRIME15 = 15% off · Pix aprovado em 2 min.`,
      hashtags: HASHTAGS[data.network],
    });

    if (!apiKey) return { ...localFallback(), source: "local" as const };

    const prompt = `Gere um ROTEIRO FACELESS único para ${data.format === "9:16" ? "Reels/Shorts vertical 9:16" : "Feed 1:1"} focado em vender ${info.pitch} (SMM). Use o gancho-semente "${seedHook}" como inspiração mas reescreva de forma inédita e chocante.

Retorne APENAS JSON estrito no formato:
{"hook":"gancho chocante de 3s (max 90 chars, emoji forte)","retention":"corpo de retenção persuasivo (2-3 frases, gatilho de autoridade + prova social)","cta":"CTA agressivo mencionando ${info.url} e cupom PRIME15"}`;

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.85,
          messages: [
            {
              role: "system",
              content:
                "Você é copywriter sênior de SMM brasileiro. Escreve roteiros Faceless inéditos, chocantes, persuasivos. Nunca repete estruturas. Responde SOMENTE em JSON válido.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));

      if (!r.ok) return { ...localFallback(), source: "fallback" as const, upstream: r.status };
      const j: any = await r.json();
      const raw = j?.choices?.[0]?.message?.content;
      if (!raw) return { ...localFallback(), source: "fallback" as const };
      const parsed = JSON.parse(raw);
      return {
        hook: String(parsed.hook || localFallback().hook).slice(0, 200),
        retention: String(parsed.retention || localFallback().retention),
        cta: String(parsed.cta || localFallback().cta),
        hashtags: HASHTAGS[data.network],
        source: "ai" as const,
      };
    } catch {
      return { ...localFallback(), source: "fallback" as const };
    }
  });
