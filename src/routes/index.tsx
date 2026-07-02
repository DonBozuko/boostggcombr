import ogInstagram from "@/assets/og-instagram.jpg";
import { CHECKOUT_SUCCESS_TITLE, CHECKOUT_SUCCESS_MESSAGE } from "@/lib/checkout-messages";
import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { ViralShare } from "@/components/ViralShare";
import { JarvisBadge } from "@/components/JarvisBadge";
import { FabianoBadge } from "@/components/FabianoBadge";
import { SocialProofPopup } from "@/components/SocialProofPopup";
import { MobileFrame } from "@/components/MobileFrame";
import { MysteryBoxRedeem } from "@/components/MysteryBoxRedeem";
import { PlansShowcaseProvider, ShowcaseTrigger, ShowcaseShell } from "@/components/PlansShowcase";
import { useScrolledPast } from "@/hooks/useScroll";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Instagram,
  Zap,
  ShieldCheck,
  RefreshCw,
  Check,
  
  Send,
  Copy,
  MessageCircle,
  Heart,
  User,
  Eye,
  Star,
} from "lucide-react";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";


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
import PixCountdown from "@/components/PixCountdown";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { getUtmSource } from "@/lib/utm";
import { getPedidoStatus } from "@/lib/admin.functions";
import { CheckCircle2 } from "lucide-react";

import { DelayedCouponField, getAppliedCoupon } from "@/components/CouponField";
import { PremiumCategorySelector } from "@/components/PremiumCategorySelector";
import { PremiumPricingGrid } from "@/components/PremiumPricingGrid";
import { getPricingGrid } from "@/lib/pricing.functions";



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
    const title = "Comprar Seguidores no Instagram Orgânicos e Reais | EliteBoost Prime";
    const description =
      "Comprar seguidores no Instagram com entrega imediata e 100% seguro. Pacotes de seguidores brasileiros, curtidas e engajamento real via Pix. Teste por R$ 5!";
    const url = "https://eliteboostprime.lovable.app/";
    const ogImage = `https://eliteboostprime.lovable.app${ogInstagram}?v=48`;
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
        { name: "google-site-verification", content: "y8Z87vQybaocMrzCC4Zzur2UBFi7VEGWAfdklGB2opM" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1216" },
        { property: "og:image:height", content: "640" },
        { property: "og:image:alt", content: "EliteBoost Prime — Seguidores reais no Instagram via Pix" },
        { property: "og:site_name", content: "EliteBoost Prime" },
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
                "@id": "https://eliteboostprime.lovable.app/#organization",
                name: "EliteBoost Prime",
                url: "https://eliteboostprime.lovable.app/",
                logo: ogImage,
                description,
                sameAs: [],
                taxID: "47363210000108",
                identifier: { "@type": "PropertyValue", propertyID: "CNPJ", value: "47363210000108" },
              },
              {
                "@type": "WebSite",
                "@id": "https://eliteboostprime.lovable.app/#website",
                url: "https://eliteboostprime.lovable.app/",
                name: "EliteBoost Prime",
                inLanguage: "pt-BR",
                publisher: { "@id": "https://eliteboostprime.lovable.app/#organization" },
              },
              {
                "@type": "Service",
                serviceType: "Marketing de Instagram e Engajamento Social",
                provider: { "@id": "https://eliteboostprime.lovable.app/#organization" },
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
                "@id": "https://eliteboostprime.lovable.app/#product",
                name: "Seguidores Reais para Instagram - EliteBoost Prime",
                description,
                brand: { "@type": "Brand", name: "EliteBoost Prime" },
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

type Categoria = "seguidores" | "curtidas" | "visualizacoes";

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

const viewsPlans: Plan[] = [
  { id: "v1k",  tier: "1.000 Views",   tag: "+ MINI",    qty: "1.000",  quantidade: 1000,  valor: 5.0,  price: "R$ 5,00",  benefit: "Entrega rápida no vídeo/reels" },
  { id: "v5k",  tier: "5.000 Views",   tag: "+ STARTER", qty: "5.000",  quantidade: 5000,  valor: 12.0, price: "R$ 12,00", benefit: "Mais alcance imediato" },
  { id: "v10k", tier: "10.000 Views",  tag: "+ BASIC",   qty: "10.000", quantidade: 10000, valor: 19.0, price: "R$ 19,00", benefit: "Mais recomendado", highlight: true },
  { id: "v25k", tier: "25.000 Views",  tag: "+ PRO",     qty: "25.000", quantidade: 25000, valor: 39.0, price: "R$ 39,00", benefit: "Boost máximo no Reels" },
  { id: "v50k", tier: "50.000 Views",  tag: "+ ELITE",   qty: "50.000", quantidade: 50000, valor: 69.0, price: "R$ 69,00", benefit: "Viralize seu conteúdo" },
];

const allPlans: Plan[] = [...plans, ...likesPlans, ...viewsPlans];



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
    .max(200, "Máximo 200 caracteres")
    .refine(
      (v) => v.startsWith("@") || /^https?:\/\//i.test(v),
      "Por favor, insira o link completo do perfil, vídeo ou publicação.",
    ),

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
  const scrolled = useScrolledPast(50);
  const [categoria, setCategoria] = useState<Categoria>("seguidores");
  const [form, setForm] = useState({ plan: "", profile: "", email: "", contact: "" });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const [mysteryBonus, setMysteryBonus] = useState<number>(0);
  const [rejectionMsg, setRejectionMsg] = useState<string | null>(null);
  const [waitingProvision, setWaitingProvision] = useState(false);
  const criarPedidoFn = useServerFn(criarPedido);
  const getStatusFn = useServerFn(getPedidoStatus);
  const blockedMap = useBlockedMap();
  const igType = categoria === "seguidores" ? "followers" : categoria === "curtidas" ? "likes" : "views";
  const tipoBloqueado = isBlocked(blockedMap, "instagram", igType);

  // v54-Patch — Strict Pricing Hydration Enforcer
  // Fonte única e imutável: server fn `getPricingGrid` → `pricing_items`.
  // Proibido cachear em localStorage (gerava drift entre builds antigos com
  // markup estático e o valor real do banco, causando oscilação R$3↔R$5).
  const getPricingGridFn = useServerFn(getPricingGrid);
  type GridItem = { id: string; quantidade: number; valor: number; price: string };
  const [gridBy, setGridBy] = useState<Record<Categoria, GridItem[]>>({
    seguidores: [], curtidas: [], visualizacoes: [],
  });
  useEffect(() => {
    let cancelled = false;
    try { window.localStorage.removeItem("ebp_pricing_overrides_v1"); } catch {}
    const cats: Array<[Categoria, "instagram:seguidores" | "instagram:curtidas" | "instagram:visualizacoes"]> = [
      ["seguidores", "instagram:seguidores"],
      ["curtidas", "instagram:curtidas"],
      ["visualizacoes", "instagram:visualizacoes"],
    ];
    Promise.all(cats.map(([, c]) => getPricingGridFn({ data: { category: c } }).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        const next: Record<Categoria, GridItem[]> = { seguidores: [], curtidas: [], visualizacoes: [] };
        results.forEach((r, i) => {
          if (r?.items?.length) next[cats[i][0]] = r.items as GridItem[];
        });
        if (next.seguidores.length || next.curtidas.length || next.visualizacoes.length) {
          setGridBy(next);
        }
      });
    return () => { cancelled = true; };
  }, [getPricingGridFn]);

  const staticById = useMemo(() => {
    const m = new Map<string, Plan>();
    for (const p of [...plans, ...likesPlans, ...viewsPlans]) m.set(p.id, p);
    return m;
  }, []);

  const buildDyn = (items: GridItem[], fallback: Plan[], unitLabel: string): Plan[] => {
    if (!items.length) return fallback;
    const tagFor = (q: number): string => {
      if (q <= 200) return "+ MINI";
      if (q <= 750) return "+ STARTER";
      if (q <= 2000) return "+ BASIC";
      if (q <= 7500) return "+ GROWTH";
      if (q <= 20000) return "+ PRO";
      if (q <= 75000) return "+ ELITE";
      return "+ ULTIMATE";
    };
    return items.map((it) => {
      const s = staticById.get(it.id);
      const qtyStr = it.quantidade.toLocaleString("pt-BR");
      return {
        id: it.id,
        tier: s?.tier ?? `${qtyStr} ${unitLabel}`,
        tag: s?.tag ?? tagFor(it.quantidade),
        qty: qtyStr,
        quantidade: it.quantidade,
        valor: it.valor,
        price: it.price,
        benefit: s?.benefit ?? "Entrega rápida e segura",
        highlight: s?.highlight,
      };
    });
  };

  const dynPlans      = useMemo(() => buildDyn(gridBy.seguidores,    plans,      "Seguidores"),    [gridBy.seguidores]);
  const dynLikesPlans = useMemo(() => buildDyn(gridBy.curtidas,      likesPlans, "Curtidas"),      [gridBy.curtidas]);
  const dynViewsPlans = useMemo(() => buildDyn(gridBy.visualizacoes, viewsPlans, "Views"),         [gridBy.visualizacoes]);
  const dynAllPlans   = useMemo(() => [...dynPlans, ...dynLikesPlans, ...dynViewsPlans], [dynPlans, dynLikesPlans, dynViewsPlans]);

  // Polling: a cada 5s consulta o status do pedido até detectar 'paid' ou rejeição.
  useEffect(() => {
    if (!modalOpen || !pedidoInfo?.pedidoId || paid || rejectionMsg) return;
    const id = pedidoInfo.pedidoId;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const stop = () => { cancelled = true; if (interval) { clearInterval(interval); interval = null; } };
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await getStatusFn({ data: { id } });
        if (cancelled || !res.ok) return;
        if (res.status === "paid") {
          const m = String((res as { error_detail?: string | null }).error_detail ?? "").match(/MB:(\d+)/);
          if (m) setMysteryBonus(Number(m[1]));
          stop(); setPaid(true); playSuccessAudio(); return;
        }
        if (res.status === "waiting_provision") {
          stop(); setWaitingProvision(true); setPaid(true); playSuccessAudio(); return;
        }
        if (res.status === "mp_rejected_insufficient") {
          stop();
          setRejectionMsg("❌ Pagamento recusado pela sua instituição financeira por saldo insuficiente. Tente outro método ou banco.");
          toast.error("Pix recusado: saldo insuficiente no banco emissor.");
          return;
        }
        if (res.status === "mp_refunded" || res.status === "SMM_FAILED") {
          stop();
          setRejectionMsg("❌ Instabilidade temporária de envio. Para sua segurança, seu pagamento foi ESTORNADO AUTOMATICAMENTE para a sua conta bancária em tempo real! Por favor, verifique seu extrato e tente novamente em alguns instantes.");
          toast.error("Estorno automático realizado com sucesso.");
          return;
        }
        if (typeof res.status === "string" && res.status.startsWith("mp_")) {
          stop();
          setRejectionMsg("❌ Pagamento recusado pelo Mercado Pago. Tente novamente.");
          return;
        }
      } catch (err) {
        console.error("[poll status]", err);
      }
    };
    tick();
    interval = setInterval(tick, 1000);
    const hardStop = setTimeout(stop, 180_000); // v104 anti-loop 3min
    return () => { stop(); clearTimeout(hardStop); };
  }, [modalOpen, pedidoInfo?.pedidoId, paid, rejectionMsg, getStatusFn]);


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = orderSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    const selected = dynAllPlans.find((p) => p.id === result.data.plan);
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
      if (typeof window !== "undefined") window.dispatchEvent(new Event("eliteboost:upsell-intent"));
      const res = await criarPedidoFn({
        data: {
          instagram_user: result.data.profile,
          pacote: selected.id,
          quantidade: selected.quantidade,
          valor: selected.valor,
          email: result.data.email,
          whatsapp_contato: result.data.contact,
          utm_source: getUtmSource(),
          cupom: getAppliedCoupon(),
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
      setRejectionMsg(null);
      setPedidoInfo({
        price: res.valorFormatado ?? selected.price,
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

  // v125 — Isolamento de tráfego: comprovantes vão para o Telegram público,
  // preservando a linha privada do Diretor no WhatsApp (alertas backend v121).
  const telegramSupportBase =
    (import.meta.env.VITE_TELEGRAM_SUPPORT_URL as string | undefined)?.trim() ||
    "https://t.me/boostgramseguidores_bot";
  const supportHref = pedidoInfo
    ? `https://t.me/share/url?url=${encodeURIComponent(telegramSupportBase)}&text=${encodeURIComponent(
        `Olá, acabei de realizar o pagamento do Pix na EliteBoost Prime para o pedido #${pedidoInfo.pedidoId} e estou enviando o comprovante para acompanhamento de rede.`,
      )}`
    : telegramSupportBase;

  // QR Code real retornado pelo Mercado Pago (base64 PNG).
  const qrCodeUrl = pedidoInfo?.qrCodeBase64
    ? `data:image/png;base64,${pedidoInfo.qrCodeBase64}`
    : "";

  return (
    <MobileFrame bg="hsl(var(--background))" route="/">
      <PlansShowcaseProvider accent="#FFD700">
      {/* NAV */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b transition-all duration-300 ${scrolled ? "border-[hsl(var(--primary))]/60 shadow-[0_2px_24px_-12px_hsl(var(--primary)/0.6)]" : "border-border"}`}>
        <div className={`container mx-auto px-6 flex items-center justify-between transition-all duration-300 ${scrolled ? "h-12" : "h-16"}`}>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg">ELITEBOOST PRIME</span>
          </div>
          <ShowcaseTrigger />
        </div>
      </header>
      <ShowcaseShell>

      {/* v115 — Mystery Box Hook: bônus dinâmico 10–50 seguidores para compras acima de 200 */}
      <div className="mx-2 mt-2 mb-1">
        <div
          className="relative overflow-hidden rounded-xl p-3 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(88,28,135,0.75) 0%, rgba(190,24,93,0.75) 50%, rgba(234,88,12,0.75) 100%)",
            border: "2px dashed #FFD700",
            boxShadow: "0 0 24px rgba(255,215,0,0.45), inset 0 0 18px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px) saturate(140%)",
          }}
          role="status"
          aria-label="Bônus Caixa Misteriosa"
        >
          <p
            className="text-white font-black leading-tight"
            style={{ fontSize: "13px", textShadow: "0 0 8px rgba(0,0,0,0.9)" }}
          >
            <span className="text-[18px]">🎁</span> <span style={{ color: "#FFD700" }}>BÔNUS ESPECIAL!</span> Nas compras acima de <span style={{ color: "#FFD700" }}>200 seguidores</span>,
            <br />
            ganhe um bônus surpresa de <span style={{ color: "#39ff14" }}>10 a 50 seguidores reais</span> após o Pix aprovado!
            <br />
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-black/40 text-[11px] uppercase tracking-wider">
              ✨ Resgate na Caixa Misteriosa após o pagamento ✨
            </span>
          </p>
        </div>
      </div>




      <PremiumCategorySelector
        accent="#FFD700"
        active={categoria}
        onChange={(k) => { setCategoria(k as Categoria); setForm((f) => ({ ...f, plan: "" })); }}
        items={[
          { key: "seguidores",    label: "Seguidores",    emoji: "👤", badge: "🔥 Mais Popular", badgeColor: "#39ff14" },
          { key: "curtidas",      label: "Curtidas",      emoji: "❤️", badge: "Em Alta",          badgeColor: "#fe0979" },
          { key: "visualizacoes", label: "Visualizações", emoji: "🎬", badge: "Recomendado",      badgeColor: "#00f2fe" },
        ]}
      />
      <div data-avatar-proof-row className="relative z-50 mx-auto mt-1 mb-2 flex w-full max-w-[550px] items-center justify-between gap-2 px-2 sm:px-3">
        <FabianoBadge variant="instagram" inline />
        <SocialProofPopup route="/" />
        <JarvisBadge variant="instagram" inline />
      </div>
      <PremiumPricingGrid
        cols={2}
        accent="#FFD700"
        disabled={tipoBloqueado}
        disabledLabel="⚠️ Em manutenção"
        unit={categoria === "seguidores" ? "Seguidores" : categoria === "curtidas" ? "Curtidas" : "Visualizações"}
        plans={(categoria === "seguidores" ? dynPlans : categoria === "curtidas" ? dynLikesPlans : dynViewsPlans).map((p) => ({
          id: p.id,
          qty: p.quantidade.toLocaleString("pt-BR"),
          price: p.price,
          fire: p.highlight,
        }))}
        onBuy={(id) => {
          setForm((f) => ({ ...f, plan: id }));
          document.getElementById("pedido")?.scrollIntoView({ behavior: "smooth" });
        }}
      />






      {/* ORDER FORM */}
      {form.plan && (<section id="pedido" className="py-16 sm:py-24 border-y border-border bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-sm sm:text-base text-zinc-300">
              Preencha os dados abaixo. Em segundos você recebe o Pix no WhatsApp.
            </p>
          </div>


          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border bg-card p-4 sm:p-8 space-y-6 shadow-glow-blue"
          >
            <div className="space-y-2">
              <Label htmlFor="plan">Pacote escolhido</Label>
              <Select value={form.plan} onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}>
                <SelectTrigger id="plan" className="h-12">
                  <SelectValue placeholder="Selecione um pacote" />
                </SelectTrigger>
                <SelectContent>
                  {dynAllPlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.tier} — {p.qty} {p.id.startsWith("v") ? "views" : p.id.startsWith("l") ? "curtidas" : "seguidores"} ({p.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile">
                {form.plan.startsWith("v")
                  ? "Link do vídeo/Reels do Instagram"
                  : "Link do Perfil do Instagram ou Usuário"}
              </Label>
              <div className="relative">
                {form.plan.startsWith("v") ? (
                  <Eye className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-300" />
                ) : (
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-300" />
                )}
                <Input
                  id="profile"
                  placeholder={form.plan.startsWith("v")
                    ? "https://instagram.com/reel/..."
                    : "@seu_perfil ou instagram.com/seu_perfil"}
                  className="h-12 pl-10"
                  value={form.profile}
                  onChange={(e) => setForm((f) => ({ ...f, profile: e.target.value }))}
                  maxLength={200}
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

            <DelayedCouponField accent="#FFD700" />

            <Button
              type="submit"
              size="lg"
              disabled={loading || tipoBloqueado}
              className="cta-pulse w-full h-16 text-lg sm:text-xl text-white font-black uppercase tracking-wider bg-[linear-gradient(135deg,#fff3a3_0%,#ffd700_25%,#f5b800_60%,#8a6a00_100%)] shadow-[0_0_30px_rgba(255,215,0,0.6)] sticky bottom-2 z-30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >

              {tipoBloqueado ? (
                <span>⚠️ Indisponível Temporariamente (Manutenção do Servidor)</span>
              ) : loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Gerando seu código Pix de pagamento... Por favor, aguarde
                </span>
              ) : (
                <>
                  💎 PAGAR COM PIX AGORA <Send className="size-5" />
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
                  <DialogTitle className="text-center text-2xl">{CHECKOUT_SUCCESS_TITLE}</DialogTitle>
                  <DialogDescription className="text-center whitespace-pre-line">
                    {CHECKOUT_SUCCESS_MESSAGE}
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
                  {waitingProvision && pedidoInfo?.pedidoId && (
                    <div className="w-full rounded-xl border border-emerald-400/40 bg-emerald-950/30 p-3 text-center">
                      <p className="text-sm text-emerald-100 font-semibold">
                        🟢 Pagamento confirmado! Seu pedido foi recebido com sucesso. Estamos realizando o processamento automático. Você será notificado assim que o serviço iniciar.
                      </p>
                      {import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER && (
                        <a
                          href={`https://wa.me/${String(import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Meu pedido ${pedidoInfo.pedidoId.slice(0, 8)} está em processamento. Pode confirmar?`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-black font-bold px-4 py-2 text-xs shadow-[0_0_14px_rgba(52,211,153,0.6)]"
                        >
                          💬 Falar com suporte no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {!waitingProvision && pedidoInfo?.pedidoId && (
                    <MysteryBoxRedeem
                      pedidoId={pedidoInfo.pedidoId}
                      quantidade={dynAllPlans.find((p) => p.id === form.plan)?.quantidade ?? 0}
                      unit={form.plan.startsWith("v") ? "views" : form.plan.startsWith("l") ? "curtidas" : "seguidores"}
                      accent="#FFD700"
                    />
                  )}
                  {!waitingProvision && (
                    <p className="text-sm text-zinc-300 text-center">
                      Entrega gradual em até 24h. Você pode fechar esta janela com tranquilidade.
                    </p>
                  )}
                </div>
                <ViralShare route="/" quantidade={dynAllPlans.find((p) => p.id === form.plan)?.quantidade ?? 0} />
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

                    <PixCountdown
                      active={modalOpen && !paid && !rejectionMsg && !!pedidoInfo?.pedidoId}
                      onExpire={() => { setModalOpen(false); setPedidoInfo(null); setRejectionMsg(null); toast.error("Tempo limite de pagamento esgotado. Por favor, gere um novo pedido para garantir o seu crescimento!"); }}
                    />
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

                    {rejectionMsg ? (
                      <div className="rounded-lg border-2 border-red-500 bg-red-950/40 py-3 px-4 text-sm text-red-200 font-semibold text-center shadow-[0_0_20px_rgba(255,0,60,0.35)]">
                        {rejectionMsg}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 py-3 text-sm text-zinc-300">
                        <span className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Aguardando pagamento...
                      </div>
                    )}

                    <Button
                      asChild
                      size="lg"
                      className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white font-bold text-base shadow-lg"
                    >
                      <a
                        href={supportHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackEvent("cta_payment_confirm_telegram", {
                            pedido_id: pedidoInfo?.pedidoId ?? "",
                            plan_tier: pedidoInfo?.tier ?? "",
                          })
                        }
                      >
                        <MessageCircle className="size-5" />
                        Já paguei! Enviar comprovante no Telegram
                      </a>
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </section>)}
      </ShowcaseShell>



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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto mb-10 px-2">
          {socialStats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3 md:p-4 text-center overflow-hidden">
              <div className="text-xl md:text-2xl font-bold break-words tracking-tight leading-tight bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-xs md:text-sm text-zinc-300 break-words tracking-tight leading-tight">{s.label}</div>
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
                <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 grid place-items-center text-white font-bold">
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
            <span className="font-display font-semibold text-foreground">ELITEBOOST PRIME</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacidade" className="hover:text-foreground">Privacidade & Segurança</a>
            <span>© 2026 EliteBoost Prime. Não somos afiliados ao Instagram ou Meta.</span>
          </div>
        </div>
      </footer>
      </PlansShowcaseProvider>
    </MobileFrame>
  );
}
