import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Instagram,
  Zap,
  ShieldCheck,
  RefreshCw,
  Check,
  Crown,
  Star,
  Sparkles,
  TrendingUp,
  ChevronDown,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BoostGram — Seguidores Reais para Instagram | 1k a 5k" },
      {
        name: "description",
        content:
          "Pacotes de seguidores Instagram com entrega rápida, sem senha e garantia de 30 dias. Bronze 1k, Prata 3k, Ouro 5k. Pague no Pix.",
      },
    ],
  }),
  component: Landing,
});

const plans = [
  {
    id: "bronze",
    tier: "Bronze",
    label: "Iniciante",
    qty: "1.000",
    price: "R$ 24,90",
    cta: "Comprar Agora",
    icon: Star,
    highlight: false,
    features: ["1.000 seguidores reais", "Entrega em até 24h", "Sem queda garantida 30 dias"],
  },
  {
    id: "prata",
    tier: "Prata",
    label: "Mais Vendido",
    qty: "3.000",
    price: "R$ 59,90",
    cta: "Garantir Desconto",
    icon: Sparkles,
    highlight: true,
    features: [
      "3.000 seguidores premium",
      "Entrega em até 12h",
      "Reposição automática 30 dias",
      "Suporte prioritário",
    ],
  },
  {
    id: "ouro",
    tier: "Ouro",
    label: "Profissional",
    qty: "5.000",
    price: "R$ 89,90",
    cta: "Alavancar Perfil",
    icon: Crown,
    highlight: false,
    features: [
      "5.000 seguidores top tier",
      "Entrega em até 6h",
      "Reposição vitalícia 30 dias",
      "Suporte VIP via WhatsApp",
    ],
  },
];

const trustBadges = [
  { icon: Zap, title: "Entrega Rápida e Segura", desc: "Processamento automático em minutos após a aprovação do Pix." },
  { icon: ShieldCheck, title: "Sem Necessidade de Senha", desc: "Trabalhamos apenas com o @ público. Sua conta nunca é acessada." },
  { icon: RefreshCw, title: "Garantia de Reposição 30 dias", desc: "Caiu? A gente repõe. Sem letra miúda, sem burocracia." },
];

const faqs = [
  {
    q: "Como funciona?",
    a: "Assim que o Pix é aprovado, o sistema processa automaticamente o envio dos seguidores para o @ informado. Você acompanha o crescimento em tempo real direto no seu Instagram.",
  },
  {
    q: "Meu perfil corre algum risco?",
    a: "Não. Usamos métodos seguros e graduais que respeitam as diretrizes da plataforma. Nenhum cliente teve conta bloqueada nos últimos 4 anos de operação.",
  },
  {
    q: "Preciso informar minha senha?",
    a: "Nunca. A gente jamais vai pedir sua senha. Só precisamos do @ do seu perfil público para fazer a entrega.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "Bronze entrega em até 24h, Prata em até 12h e Ouro em até 6h. Na prática, 90% dos pedidos começam em minutos.",
  },
  {
    q: "Posso pagar de outra forma além do Pix?",
    a: "Hoje trabalhamos exclusivamente com Pix por ser instantâneo e ter taxa zero — isso te garante o melhor preço do mercado.",
  },
];

const orderSchema = z.object({
  plan: z.string().min(1, "Selecione um pacote"),
  profile: z
    .string()
    .trim()
    .min(2, "Informe seu @ do Instagram")
    .max(50, "Máximo 50 caracteres")
    .regex(/^@?[A-Za-z0-9._]+$/, "Use apenas letras, números, . e _"),
  contact: z
    .string()
    .trim()
    .min(5, "Informe WhatsApp ou e-mail")
    .max(120, "Máximo 120 caracteres"),
});

function Landing() {
  const [form, setForm] = useState({ plan: "", profile: "", contact: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = orderSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Pedido recebido! Em instantes você receberá o Pix no contato informado.");
      setForm({ plan: "", profile: "", contact: "" });
    }, 900);
  };

  return (
    <div className="dark min-h-screen text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
              <TrendingUp className="size-4 text-background" />
            </div>
            <span className="font-display font-bold text-lg">BoostGram</span>
          </div>
          <Button asChild size="sm" className="bg-[image:var(--gradient-cta)] text-background font-semibold hover:opacity-90">
            <a href="#planos">Ver Planos</a>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="container mx-auto px-6 pt-24 pb-32 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--neon)] opacity-75 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--neon)]" />
            </span>
            +12.847 perfis impulsionados em 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight"
          >
            Seu perfil <span className="text-gradient">explodindo</span><br />
            em até 24 horas.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Pacotes de seguidores reais para Instagram. Entrega automática após o Pix,
            sem precisar da sua senha, com garantia de reposição por 30 dias.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button asChild size="lg" className="h-12 px-8 bg-[image:var(--gradient-cta)] text-background font-semibold shadow-glow hover:opacity-90">
              <a href="#planos">Quero Bombar Meu Perfil</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 border-border bg-card/40">
              <a href="#faq">Como Funciona</a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="container mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Escolha seu pacote</h2>
          <p className="mt-4 text-muted-foreground">
            Preço fixo, sem assinatura, sem pegadinha. Pague uma vez e veja o resultado.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  p.highlight
                    ? "border-[var(--neon)] bg-card shadow-glow scale-[1.03]"
                    : "border-border bg-card/60"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[image:var(--gradient-cta)] text-background text-xs font-bold uppercase tracking-wider">
                    {p.label}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`size-10 rounded-lg grid place-items-center ${p.highlight ? "bg-[image:var(--gradient-cta)] text-background" : "bg-muted text-foreground"}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-xl">{p.tier}</div>
                    {!p.highlight && <div className="text-xs text-muted-foreground">{p.label}</div>}
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-5xl font-display font-bold">{p.qty}</span>
                  <span className="text-muted-foreground ml-2">seguidores</span>
                </div>
                <div className="text-3xl font-display font-bold text-gradient mb-6">{p.price}</div>

                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-[var(--neon)] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  className={
                    p.highlight
                      ? "bg-[image:var(--gradient-cta)] text-background font-semibold shadow-glow hover:opacity-90"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }
                >
                  <a
                    href="#pedido"
                    onClick={() => setForm((f) => ({ ...f, plan: p.id }))}
                  >
                    {p.cta}
                  </a>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ORDER FORM */}
      <section id="pedido" className="py-24 border-y border-border bg-card/30">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">Faça seu pedido</h2>
            <p className="mt-3 text-muted-foreground">
              Preencha os dados abaixo. Em segundos você recebe o Pix.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-glow-blue"
          >
            <div className="space-y-2">
              <Label htmlFor="plan">Pacote escolhido</Label>
              <Select value={form.plan} onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}>
                <SelectTrigger id="plan" className="h-12">
                  <SelectValue placeholder="Selecione um pacote" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.tier} — {p.qty} seguidores ({p.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile">Link ou @ do Instagram</Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="profile"
                  placeholder="@seu_perfil"
                  className="h-12 pl-10"
                  value={form.profile}
                  onChange={(e) => setForm((f) => ({ ...f, profile: e.target.value }))}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">WhatsApp ou E-mail (para o comprovante)</Label>
              <Input
                id="contact"
                placeholder="(11) 99999-9999 ou voce@email.com"
                className="h-12"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                maxLength={120}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-12 bg-[image:var(--gradient-cta)] text-background font-semibold shadow-glow hover:opacity-90"
            >
              {loading ? "Processando..." : (
                <>
                  Gerar Pix <Send className="size-4" />
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Pagamento seguro · Pedido processado em segundos após o Pix
            </p>
          </form>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="container mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {trustBadges.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card/60 p-8 text-center"
              >
                <div className="size-14 mx-auto rounded-xl bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow mb-5">
                  <Icon className="size-6 text-background" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-6 py-24 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold">Perguntas frequentes</h2>
          <p className="mt-3 text-muted-foreground">Tudo o que você precisa saber antes de comprar.</p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border bg-card/60 px-6 border-b"
            >
              <AccordionTrigger className="text-left font-display font-semibold hover:no-underline py-5">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[image:var(--gradient-cta)]" />
            <span className="font-display font-semibold text-foreground">BoostGram</span>
          </div>
          <p>© 2026 BoostGram. Não somos afiliados ao Instagram ou Meta.</p>
        </div>
      </footer>
    </div>
  );
}
