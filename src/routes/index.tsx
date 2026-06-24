import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Instagram,
  Zap,
  ShieldCheck,
  RefreshCw,
  Check,
  TrendingUp,
  Send,
  Copy,
  MessageCircle,
  Heart,
  User,
  Eye,
  Star,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { getPedidoStatus } from "@/lib/admin.functions";
import { CheckCircle2 } from "lucide-react";

const WHATSAPP_ADMIN = "5515997445388";

// Analytics: dispara evento p/ gtag, dataLayer (GTM) e fbq, sem quebrar se nenhum existir.
type TrackPayload = Record<string, string | number | boolean | undefined>;
function trackEvent(name: string, payload: TrackPayload = {}) {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as {
      gtag?: (...a: unknown[]) => void;
      dataLayer?: unknown[];
      fbq?: (...a: unknown[]) => void;
    };
    w.gtag?.("event", name, payload);
    w.dataLayer?.push({ event: name, ...payload });
    w.fbq?.("trackCustom", name, payload);
    if (import.meta.env.DEV) console.debug("[track]", name, payload);
  } catch (err) {
    console.error("[trackEvent]", err);
  }
}

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Comprar Seguidores no Instagram Orgânicos e Reais | Boostygram";
    const description =
      "Comprar seguidores no Instagram com entrega imediata e 100% seguro. Pacotes de seguidores brasileiros, curtidas e engajamento real via Pix. Teste por R$ 5!";
    const url = "https://boostygram.lovable.app/";
    const ogImage = "https://boostygram.lovable.app/__l5e/assets-v1/676afb5f-ed9d-49df-9171-6c3166ce217a/og-boostygram.jpg";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "keywords",
          content:
            "comprar seguidores instagram, comprar seguidores brasileiros, seguidores reais instagram, comprar curtidas brasileiras, seguidores instagram barato, impulsionar instagram pix, seguidor de perfil, vaiviral, comprar seguidor do brasil, ganhar seguidores instagram rápido, automação de engajamento instagram, site para comprar seguidores",
        },
        { name: "robots", content: "index, follow" },
        { name: "google-site-verification", content: "googlea461f60ce7ae2c61" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1216" },
        { property: "og:image:height", content: "640" },
        { property: "og:image:alt", content: "Boostygram — Seguidores reais no Instagram via Pix" },
        { property: "og:site_name", content: "Boostygram" },
        { property: "og:locale", content: "pt_BR" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://boostygram.lovable.app/#organization",
                name: "Boostygram",
                url: "https://boostygram.lovable.app/",
                logo: ogImage,
                description,
                sameAs: [],
              },
              {
                "@type": "WebSite",
                "@id": "https://boostygram.lovable.app/#website",
                url: "https://boostygram.lovable.app/",
                name: "Boostygram",
                inLanguage: "pt-BR",
                publisher: { "@id": "https://boostygram.lovable.app/#organization" },
              },
              {
                "@type": "Service",
                serviceType: "Marketing de Instagram e Engajamento Social",
                provider: { "@id": "https://boostygram.lovable.app/#organization" },
                areaServed: { "@type": "Country", name: "Brasil" },
                name: "Compra de Seguidores Reais no Instagram",
                description,
                offers: {
                  "@type": "AggregateOffer",
                  priceCurrency: "BRL",
                  lowPrice: "5.00",
                  highPrice: "499.00",
                  offerCount: "9",
                  availability: "https://schema.org/InStock",
                },
              },
              {
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "Os seguidores são reais?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Sim. Entregamos seguidores reais com perfis ativos, sem bots, com entrega imediata via Pix.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Preciso fornecer minha senha?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Não. Só precisamos do seu @usuário público do Instagram. Nunca pedimos senha.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Em quanto tempo recebo os seguidores?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "A entrega começa em poucos minutos após a confirmação do Pix.",
                    },
                  },
                ],
              },
              {
                "@type": "Product",
                "@id": "https://boostygram.lovable.app/#product",
                name: "Seguidores Reais para Instagram - Boostygram",
                description,
                brand: { "@type": "Brand", name: "Boostygram" },
                image: ogImage,
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.9",
                  bestRating: "5",
                  worstRating: "1",
                  ratingCount: "147",
                  reviewCount: "147",
                },
                review: [
                  {
                    "@type": "Review",
                    author: { "@type": "Person", name: "Larissa M." },
                    reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
                    reviewBody:
                      "Cheguei em 12k em uma semana. O engajamento dobrou e fechei 3 publis novas.",
                  },
                  {
                    "@type": "Review",
                    author: { "@type": "Person", name: "Rafael D." },
                    reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
                    reviewBody:
                      "Pix caiu, em 4 minutos já tinham começado a entregar. Surreal.",
                  },
                  {
                    "@type": "Review",
                    author: { "@type": "Person", name: "Camila S." },
                    reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
                    reviewBody:
                      "Já testei vários sites e só aqui não caiu seguidor depois. Suporte responde rápido.",
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },


  component: Landing,
});

type Plan = {
  id: string;
  tier: string;
  tag: string;
  qty: string;
  quantidade: number;
  valor: number;
  price: string;
  benefit: string;
  highlight?: boolean;
};

type Categoria = "seguidores" | "curtidas";

const plans: Plan[] = [
  { id: "p100",   tier: "100 Seguidores",     tag: "+ MINI",     qty: "100",     quantidade: 100,    valor: 5.0,   price: "R$ 5,00",   benefit: "Entrega rápida e segura" },
  { id: "p500",   tier: "500 Seguidores",     tag: "+ STARTER",  qty: "500",     quantidade: 500,    valor: 12.0,  price: "R$ 12,00",  benefit: "Entrega rápida e segura" },
  { id: "p1k",    tier: "1.000 Seguidores",   tag: "+ BASIC",    qty: "1.000",   quantidade: 1000,   valor: 18.0,  price: "R$ 18,00",  benefit: "Entrega rápida e segura" },
  { id: "p2k",    tier: "2.000 Seguidores",   tag: "+ GROWTH",   qty: "2.000",   quantidade: 2000,   valor: 30.0,  price: "R$ 30,00",  benefit: "Entrega rápida e segura" },
  { id: "p5k",    tier: "5.000 Seguidores",   tag: "+ PRO",      qty: "5.000",   quantidade: 5000,   valor: 65.0,  price: "R$ 65,00",  benefit: "Entrega rápida e segura" },
  { id: "p10k",   tier: "10.000 Seguidores",  tag: "+ VIP",      qty: "10.000",  quantidade: 10000,  valor: 120.0, price: "R$ 120,00", benefit: "Mais recomendado pelos clientes", highlight: true },
  { id: "p20k",   tier: "20.000 Seguidores",  tag: "+ ELITE",    qty: "20.000",  quantidade: 20000,  valor: 220.0, price: "R$ 220,00", benefit: "Entrega rápida e segura" },
  { id: "p50k",   tier: "50.000 Seguidores",  tag: "+ MASTER",   qty: "50.000",  quantidade: 50000,  valor: 490.0, price: "R$ 490,00", benefit: "Entrega rápida e segura" },
  { id: "p100k",  tier: "100.000 Seguidores", tag: "+ ULTIMATE", qty: "100.000", quantidade: 100000, valor: 890.0, price: "R$ 890,00", benefit: "Entrega rápida e segura" },
];

const likesPlans: Plan[] = [
  { id: "l100", tier: "100 Curtidas",   tag: "+ MINI",    qty: "100",   quantidade: 100,  valor: 3.0,  price: "R$ 3,00",  benefit: "Entrega rápida em qualquer post" },
  { id: "l500", tier: "500 Curtidas",   tag: "+ STARTER", qty: "500",   quantidade: 500,  valor: 7.0,  price: "R$ 7,00",  benefit: "Engajamento real e seguro" },
  { id: "l1k",  tier: "1.000 Curtidas", tag: "+ BASIC",   qty: "1.000", quantidade: 1000, valor: 12.0, price: "R$ 12,00", benefit: "Mais recomendado", highlight: true },
  { id: "l2k",  tier: "2.000 Curtidas", tag: "+ GROWTH",  qty: "2.000", quantidade: 2000, valor: 19.0, price: "R$ 19,00", benefit: "Boost rápido no alcance" },
  { id: "l5k",  tier: "5.000 Curtidas", tag: "+ PRO",     qty: "5.000", quantidade: 5000, valor: 39.0, price: "R$ 39,00", benefit: "Máximo impacto no post" },
];

const allPlans: Plan[] = [...plans, ...likesPlans];


const trustBadges = [
  { icon: Zap, title: "Entrega Automática e Segura", desc: "Processamento automático em minutos após a aprovação do Pix." },
  { icon: ShieldCheck, title: "Sem Necessidade de Senha", desc: "Trabalhamos apenas com o @ público. Sua conta nunca é acessada." },
  { icon: RefreshCw, title: "Garantia de Reposição de 30 dias", desc: "Caiu? A gente repõe. Sem letra miúda, sem burocracia." },
];

const testimonials = [
  { name: "Larissa M.", handle: "@lari.makeup", text: "Cheguei em 12k em uma semana. O engajamento dobrou e fechei 3 publis novas.", pkg: "Pacote 10k" },
  { name: "Rafael D.", handle: "@rafadias.fit", text: "Pix caiu, em 4 minutos já tinham começado a entregar. Surreal.", pkg: "Pacote 5k" },
  { name: "Camila S.", handle: "@cami.travel", text: "Já testei vários sites e só aqui não caiu seguidor depois. Suporte responde rápido.", pkg: "Pacote 20k" },
];

const socialStats = [
  { value: "+12.500", label: "Clientes ativos" },
  { value: "98%", label: "Pagamentos via Pix aprovados" },
  { value: "4.9/5", label: "Avaliação média" },
  { value: "24/7", label: "Suporte no WhatsApp" },
];


const faqs = [
  {
    q: "Como funciona?",
    a: "O sistema processa o envio assim que o Pix é aprovado. Você acompanha o crescimento em tempo real direto no seu Instagram.",
  },
  {
    q: "Meu perfil corre algum risco?",
    a: "Não. Usamos métodos seguros e graduais que respeitam as diretrizes da plataforma. Nenhum cliente teve conta bloqueada nos últimos 4 anos de operação.",
  },
  {
    q: "Preciso informar minha senha?",
    a: "Nunca pediremos sua senha. Precisamos apenas do @ do perfil público para fazer a entrega.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "Start entrega em até 24h, Growth em até 12h e VIP em até 6h. Na prática, 90% dos pedidos começam em minutos.",
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
    .min(2, "Informe o link ou @ do Instagram")
    .max(120, "Máximo 120 caracteres"),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido")
    .max(120, "Máximo 120 caracteres"),
  contact: z
    .string()
    .trim()
    .min(5, "Informe seu WhatsApp")
    .max(120, "Máximo 120 caracteres"),
});

type PedidoInfo = {
  price: string;
  tier: string;
  profile: string;
  pixCode: string;
  qrCodeBase64: string;
  pedidoId: string | null;
};

function Landing() {
  const [categoria, setCategoria] = useState<Categoria>("seguidores");
  const [form, setForm] = useState({ plan: "", profile: "", email: "", contact: "" });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);

  // Polling: a cada 3s consulta o status do pedido até detectar 'paid'.
  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getStatusFn({ data: { id } });
        if (!cancelled && res.ok && res.status === "paid") setPaid(true);
      } catch (err) {
        console.error("[poll status]", err);
      }
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, getStatusFn]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = orderSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    const selected = allPlans.find((p) => p.id === result.data.plan);
    if (!selected) {
      toast.error("Pacote inválido.");
      return;
    }
    trackEvent("checkout_submit", {
      plan_id: selected.id,
      plan_tier: selected.tier,
      plan_value: selected.valor,
    });
    setLoading(true);
    try {
      const res = await criarPedidoFn({
        data: {
          instagram_user: result.data.profile,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: result.data.email,
          whatsapp_contato: result.data.contact,
        },
      });
      if (!res?.ok) {
        console.error("criarPedido falhou:", res);
      }
      if (!res?.ok) {
        toast.error("Não foi possível gerar o Pix. Tente novamente em instantes.");
        return;
      }
      setPaid(false);
      setPedidoInfo({
        price: selected.price,
        tier: selected.tier,
        profile: result.data.profile,
        pixCode: res.qrCode,
        qrCodeBase64: res.qrCodeBase64,
        pedidoId: res.pedidoId,
      });
      setModalOpen(true);
    } catch (err) {
      console.error("Erro inesperado em criarPedido:", err);
      toast.error("Erro ao registrar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async () => {
    if (!pedidoInfo) return;
    try {
      await navigator.clipboard.writeText(pedidoInfo.pixCode);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  const whatsappHref = pedidoInfo
    ? `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(
        `Olá! Acabei de fazer o pagamento do pacote ${pedidoInfo.tier} para o perfil ${pedidoInfo.profile}. Segue o comprovante.`,
      )}`
    : `https://wa.me/${WHATSAPP_ADMIN}`;

  // QR Code real retornado pelo Mercado Pago (base64 PNG).
  const qrCodeUrl = pedidoInfo?.qrCodeBase64
    ? `data:image/png;base64,${pedidoInfo.qrCodeBase64}`
    : "";

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
        <div className="container mx-auto px-6 pt-20 pb-20 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-8 size-20 rounded-2xl grid place-items-center bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 shadow-[0_0_60px_-5px_rgba(236,72,153,0.7)]"
          >
            <Instagram className="size-10 text-white" strokeWidth={2.2} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight"
          >
            Impulsione seu Perfil com{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
              Seguidores Reais
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-5 text-base md:text-lg text-zinc-300 max-w-xl mx-auto"
          >
            Entrega automática · 100% seguro · Sem senha · Garantia de reposição 30 dias.
          </motion.p>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap gap-3 justify-center"
          >
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-pink-500/40 bg-pink-500/10 px-5 py-2.5 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors"
            >
              <Heart className="size-4 fill-pink-400 text-pink-400" />
              Curtidas
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-5 py-2.5 text-sm font-semibold text-fuchsia-300 hover:bg-fuchsia-500/20 transition-colors"
            >
              <User className="size-4" />
              Seguidores
            </button>
          </motion.div>
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="container mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Escolha seu pacote</h2>
          <p className="mt-3 text-zinc-300">
            Preço fixo, sem pegadinha. Pague uma vez e veja o resultado.
          </p>
        </div>

        {/* Tabs categoria */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 rounded-full border border-white/10 bg-zinc-900/70 backdrop-blur">
            {(["seguidores", "curtidas"] as Categoria[]).map((c) => {
              const active = categoria === c;
              const Icon = c === "seguidores" ? User : Heart;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategoria(c);
                    setForm((f) => ({ ...f, plan: "" }));
                    trackEvent("tab_category_change", { category: c });
                  }}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wide transition-all ${
                    active
                      ? "bg-[linear-gradient(135deg,#feda77_0%,#f58529_25%,#dd2a7b_60%,#8134af_100%)] text-white shadow-[0_0_25px_rgba(249,115,22,0.6)]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className={`size-4 ${active && c === "curtidas" ? "fill-white" : ""}`} />
                  {c === "seguidores" ? "Seguidores" : "Curtidas"}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={categoria}
            initial={{ opacity: 0, x: categoria === "seguidores" ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: categoria === "seguidores" ? 24 : -24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch"
          >
            {(categoria === "seguidores" ? plans : likesPlans).map((p, i) => {
              const viewing = 100 + ((p.quantidade * 7 + i * 53) % 500);
              const isLikes = p.id.startsWith("l");
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                  className={`relative rounded-2xl border bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-6 pt-8 flex flex-col items-center text-center ${
                    p.highlight
                      ? "border-transparent lg:scale-105 lg:-my-2 z-10 shadow-[0_0_50px_-8px_rgba(236,72,153,0.75)] [background:linear-gradient(#0a0a0a,#0a0a0a)_padding-box,linear-gradient(135deg,#feda77,#f58529,#dd2a7b,#8134af)_border-box] border-2"
                      : "border-white/10 hover:border-fuchsia-500/40 transition-colors"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap shadow-[0_0_25px_rgba(249,115,22,0.8)]">
                      ⭐ Mais Vendido
                    </div>
                  )}

                  <div className={`${p.highlight ? "mt-3" : ""} px-4 py-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap shadow-[0_0_20px_rgba(236,72,153,0.7)]`}>
                    {p.tag}
                  </div>

                  <div className="mt-4 mb-4 size-16 rounded-full grid place-items-center bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 shadow-[0_0_30px_-2px_rgba(236,72,153,0.8)]">
                    {isLikes ? (
                      <Heart className="size-7 text-white fill-white" strokeWidth={2.2} />
                    ) : (
                      <Instagram className="size-7 text-white" strokeWidth={2.2} />
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white">{p.tier}</h3>
                  <p className="mt-1 text-xs text-zinc-300">{p.benefit}</p>

                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                    <Eye className="size-3.5" />
                    {viewing} pessoas vendo agora
                  </div>

                  <div className="mt-5 text-4xl font-extrabold text-white tracking-tight">
                    {p.price}
                  </div>

                  <a
                    href="#pedido"
                    onClick={() => {
                      setForm((f) => ({ ...f, plan: p.id }));
                      trackEvent("cta_plan_click", {
                        plan_id: p.id,
                        plan_tier: p.tier,
                        plan_quantity: p.quantidade,
                        plan_value: p.valor,
                        highlight: p.highlight ?? false,
                      });
                    }}
                    className="cta-pulse mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white bg-[linear-gradient(135deg,#feda77_0%,#f58529_25%,#dd2a7b_60%,#8134af_100%)] transition-all"
                    aria-label={`Comprar pacote ${p.tier} por ${p.price}`}
                  >
                    <Zap className="size-4 fill-white" /> COMPRAR AGORA
                  </a>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

      </section>



      {/* ORDER FORM */}
      <section id="pedido" className="py-24 border-y border-border bg-card/30">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">Faça seu pedido</h2>
            <p className="mt-3 text-zinc-300">
              Preencha os dados abaixo. Em segundos você recebe o Pix no WhatsApp.
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
                  {allPlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.tier} — {p.qty} {p.id.startsWith("l") ? "curtidas" : "seguidores"} ({p.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile">Link do Perfil do Instagram ou Usuário</Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-300" />
                <Input
                  id="profile"
                  placeholder="@seu_perfil ou instagram.com/seu_perfil"
                  className="h-12 pl-10"
                  value={form.profile}
                  onChange={(e) => setForm((f) => ({ ...f, profile: e.target.value }))}
                  maxLength={120}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail (para o recibo do Mercado Pago)</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@email.com"
                className="h-12"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">WhatsApp para contato e envio do comprovante</Label>
              <Input
                id="contact"
                placeholder="(11) 99999-9999"
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
              className="cta-pulse w-full h-12 text-white font-bold uppercase tracking-wide bg-[linear-gradient(135deg,#feda77_0%,#f58529_25%,#dd2a7b_60%,#8134af_100%)] transition-all"
            >

              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Gerando seu código Pix de pagamento... Por favor, aguarde
                </span>
              ) : (
                <>
                  Gerar Pix <Send className="size-4" />
                </>
              )}
            </Button>
            <p className="text-xs text-center text-zinc-300">
              Pagamento seguro · Pedido processado em segundos após o Pix
            </p>
          </form>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md border-border bg-card">
            {paid ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-center text-2xl">🎉 Pagamento confirmado!</DialogTitle>
                  <DialogDescription className="text-center">
                    Seu pedido está em produção. Os seguidores começam a chegar em poucos minutos.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <CheckCircle2 className="size-20 text-green-500" strokeWidth={1.5} />
                  {pedidoInfo && (
                    <div className="text-center">
                      <div className="text-xs uppercase tracking-wider text-zinc-300">
                        Pacote {pedidoInfo.tier} · {pedidoInfo.profile}
                      </div>
                      <div className="text-3xl font-display font-bold text-gradient mt-1">
                        {pedidoInfo.price}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-zinc-300 text-center">
                    Entrega gradual em até 24h. Você pode fechar esta janela com tranquilidade.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full h-12 bg-[image:var(--gradient-cta)] text-background font-bold"
                  onClick={() => setModalOpen(false)}
                >
                  Fechar
                </Button>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-center text-xl">Pague com Pix para liberar</DialogTitle>
                  <DialogDescription className="text-center">
                    Escaneie o QR Code ou use o Pix Copia e Cola. A entrega inicia automaticamente após a confirmação.
                  </DialogDescription>
                </DialogHeader>

                {pedidoInfo && (
                  <div className="space-y-5">
                    <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
                      <div className="text-xs uppercase tracking-wider text-zinc-300">
                        Pacote {pedidoInfo.tier} · {pedidoInfo.profile}
                      </div>
                      <div className="text-3xl font-display font-bold text-gradient mt-1">
                        {pedidoInfo.price}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="rounded-xl bg-white p-3 shadow-glow">
                        <img
                          src={qrCodeUrl}
                          alt="QR Code Pix"
                          width={220}
                          height={220}
                          className="block"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Pix Copia e Cola</Label>
                      <div className="rounded-lg border border-border bg-muted p-3 text-xs break-all font-mono max-h-24 overflow-y-auto">
                        {pedidoInfo.pixCode}
                      </div>
                      <Button
                        type="button"
                        onClick={copyPix}
                        variant="outline"
                        className="w-full h-11 border-border bg-card/40"
                      >
                        <Copy className="size-4" /> Copiar Código
                      </Button>
                    </div>

                    <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 py-3 text-sm text-zinc-300">
                      <span className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Aguardando pagamento...
                    </div>

                    <Button
                      asChild
                      size="lg"
                      className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-bold text-base shadow-lg"
                    >
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackEvent("cta_payment_confirm_whatsapp", {
                            pedido_id: pedidoInfo?.pedidoId ?? "",
                            plan_tier: pedidoInfo?.tier ?? "",
                          })
                        }
                      >
                        <MessageCircle className="size-5" />
                        Já paguei! Enviar comprovante no WhatsApp
                      </a>
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </section>


      {/* SOCIAL PROOF */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1 mb-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="size-5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-2 text-sm font-semibold text-zinc-200">4.9/5 · +12.500 clientes</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">Quem usa, recomenda</h2>
          <p className="mt-3 text-zinc-300">Relatos reais de quem impulsionou o perfil com a gente.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-10">
          {socialStats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-center">
              <div className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-xs md:text-sm text-zinc-300">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.handle}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-6 flex flex-col"
            >
              <div className="flex items-center gap-1 mb-3">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} className="size-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed flex-1">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-white/10">
                <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 grid place-items-center text-white font-bold">
                  {t.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                  <div className="text-xs text-zinc-400 truncate">{t.handle} · {t.pkg}</div>
                </div>
              </div>
            </motion.div>
          ))}
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
                <p className="text-sm text-zinc-300">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-6 py-24 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold">Perguntas frequentes</h2>
          <p className="mt-3 text-zinc-300">Tudo o que você precisa saber antes de comprar.</p>
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
              <AccordionContent className="text-zinc-300 pb-5">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-300">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[image:var(--gradient-cta)]" />
            <span className="font-display font-semibold text-foreground">BoostGram</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacidade" className="hover:text-foreground">Privacidade & Segurança</a>
            <span>© 2026 BoostGram. Não somos afiliados ao Instagram ou Meta.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
