// v417 — Institucional: Quem Somos (Autoridade da Marca)
import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/BrandHeader";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Users, Trophy } from "lucide-react";

export const Route = createFileRoute("/quem-somos")({
  head: () => ({
    meta: [
      { title: "Quem Somos — BoostGG | Líder em Crescimento Digital" },
      { name: "description", content: "Conheça a BoostGG, a plataforma líder em crescimento para redes sociais no Brasil. Segurança, velocidade e resultados reais para o seu perfil." },
      { property: "og:title", content: "Quem Somos — BoostGG" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.boostgg.com.br/quem-somos" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrandHeader />
      
      <main className="container mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Impulsionando a Presença Digital de Milhares de Brasileiros
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            A BoostGG nasceu com uma missão clara: democratizar o acesso ao crescimento nas redes sociais com segurança, transparência e tecnologia de ponta.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-20">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Nossa História
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              Fundada em 2021, a BoostGG percebeu que o mercado de seguidores era dominado por serviços instáveis e sem suporte. Decidimos mudar o jogo criando uma plataforma automatizada, integrada com as APIs de pagamento mais rápidas do Brasil (Pix) e focada na satisfação real do cliente.
            </p>
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" /> Nossos Valores
            </h2>
            <ul className="space-y-4 text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-emerald-500" />
                <strong>Segurança em Primeiro Lugar:</strong> Nunca pedimos senhas ou dados sensíveis.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-emerald-500" />
                <strong>Transparência:</strong> Informamos exatamente o que você está comprando e como será entregue.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-emerald-500" />
                <strong>Velocidade:</strong> Entendemos que no digital, o tempo é dinheiro. Por isso, somos obcecados pela entrega rápida.
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto py-12 border-y border-white/5">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">+12k</div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Clientes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">24/7</div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Suporte</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">99%</div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Taxa de Sucesso</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">Minutos</div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Entrega Média</div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-300">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[image:var(--gradient-cta)]" />
            <span className="font-display font-semibold text-foreground">BOOSTGG</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/" className="hover:text-foreground">Início</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <span>© 2026 BoostGG.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

