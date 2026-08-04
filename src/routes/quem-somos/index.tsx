// v413 — SEO: Quem Somos / Institucional (Entidade de Marca)
import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/BrandHeader";
import { ShieldCheck, Users, Zap, Award } from "lucide-react";

const URL = "https://www.boostgg.com.br/quem-somos";
const TITLE = "Sobre a BoostGG — A Agência de Crescimento Social Nº 1 | Elite Boost Prime";
const DESC =
  "Conheça a BoostGG (Elite Boost Prime), a maior agência de impulsionamento social do Brasil. Mais de 4 anos de operação e 12.000 clientes satisfeitos.";

export const Route = createFileRoute("/quem-somos/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <BrandHeader subtitle="Conheça nossa agência" />
      
      <main className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Liderança e Confiança no Crescimento Social
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            A BoostGG, parte do grupo Elite Boost Prime, nasceu com uma missão clara: democratizar o acesso a uma audiência qualificada nas redes sociais.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Segurança Absoluta</h3>
              <p className="mt-2 text-muted-foreground">Nossos processos são blindados. Não solicitamos senhas e seguimos rigorosamente as diretrizes das plataformas.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">+12.000 Clientes</h3>
              <p className="mt-2 text-muted-foreground">Atendemos desde micro-influenciadores até grandes marcas nacionais, consolidando autoridade digital dia após dia.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold Tecnologia Própria">Tecnologia Própria</h3>
              <p className="mt-2 text-muted-foreground">Nosso sistema de inteligência (J.A.R.V.I.S.) monitora a saúde das entregas em tempo real, garantindo velocidade recorde.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Qualidade Elite</h3>
              <p className="mt-2 text-muted-foreground">Fomos pioneiros no Brasil na entrega de seguidores reais e brasileiros com garantia de reposição de 30 dias.</p>
            </div>
          </div>
        </div>

        <section className="mt-24 rounded-2xl bg-muted/50 p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Nossa História</h2>
          <div className="mt-6 space-y-6 text-lg text-muted-foreground">
            <p>
              Fundada em 2022, a BoostGG percebeu que o maior obstáculo para novos criadores no Brasil era a falta de prova social inicial. O mercado estava saturado de serviços estrangeiros de baixa qualidade que derrubavam perfis.
            </p>
            <p>
              Investimos em infraestrutura local para oferecer seguidores brasileiros reais. Hoje, somos referência nacional em entrega via Pix, operando 24 horas por dia com suporte humanizado.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
