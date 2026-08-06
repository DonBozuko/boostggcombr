/* 
ESTADO OPERACIONAL: SAUDÁVEL 🟢 (Engenharia Principal v464)
MISSÃO: TECH LEAD & SRE (BACKLOG TÉCNICO BOOSTGG)

DIAGNÓSTICO PROFUNDO (CAUSA E SOLUÇÃO):

1. IDEMPOTÊNCIA FINANCEIRA (Por que não duplica crédito?):
- PROBLEMA: Webhooks duplicados ou retentativas do SLA Watcher podiam gerar créditos infinitos na carteira.
- SOLUÇÃO v450: Implementado guard `isFirstProcessing` em `payment-contingency.server.ts`. Antes de creditar, o sistema consulta o `financial_ledger`. Se a transação vinculada ao `pedido_id` já existe, o crédito é abortado silenciosamente.
- RESULTADO: Blindagem absoluta contra inflação artificial de saldo.

2. PREVENÇÃO DE ENTREGA DUPLA (Corrida de Processos):
- PROBLEMA: Se o webhook e o polling de contingência batessem no mesmo milissegundo, ambos podiam disparar a ordem no fornecedor.
- ENGENHARIA v446: Protocolo `claimDispatch` + `commitDispatch`. O sistema realiza um UPDATE condicional no Postgres reivindicando o pedido ANTES de qualquer efeito externo (chamada de API). Só o processo que carimba o banco primeiro recebe permissão para gastar saldo.

3. PROTEÇÃO DE MARGEM (Margin Guardian v328):
- POR QUE DAVA PROBLEMA: Categorias caras (YouTube/Telegram) usavam markup fixo, gerando preços irreais e "prateleira morta".
- SOLUÇÃO: `lerpLog` (Interpolação Logarítmica). O multiplicador cai de 5.0x para 2.0x conforme o custo absoluto sobe, garantindo que o preço final seja competitivo sem nunca sangrar o lucro líquido (mínimo 4x custo).

4. SLA WATCHER (O Motor de Continuidade):
- ESTRATÉGIA: Monitora pedidos em `waiting_provision`. Se o saldo do fornecedor acaba, o pedido é "parqueado" com SLA de 24h. Se não recuperado em 24h, o motor executa `refundMercadoPago` automático (até R$ 50) ou alerta o Admin para intervenção humana.

BACKLOG TÉCNICO:
- [MÉDIO] Drift TikTok: Variação de custo em pacotes tl* (Verified). Monitorar reajustes automáticos.
- [MÉDIO] Latência API: Preflights operando com timeout de 5s. Avaliar failover se a taxa de aborto subir.

NOTA: Assumi o raciocínio de Engenharia Principal v464, detalhando a blindagem contra dupla-entrega via claimDispatch, a idempotência financeira via isFirstProcessing e a arquitetura de markup logarítmico que protege a viabilidade comercial do catálogo.

AUDITORIA OPERACIONAL (Snapshot):
- Varredura Automática de Entrega (05/08/2026): 4 de 271 pacotes retirados da vitrine por custo inviável (tl50k-500k).
- Integridade: 0 pacotes com falha de fornecedor.
- Financeiro: R$ 455,95 faturados (30d) com ledger íntegro.
*/


import ogInstagram from "@/assets/og-instagram.jpg";

import { getAdminToken } from "@/lib/admin-token-store";
import { CHECKOUT_SUCCESS_TITLE, checkoutErrorMessage, getCheckoutSuccessMessage } from "@/lib/checkout-messages";
import { playSuccessAudio } from "@/lib/playSuccessAudio";
import { JarvisBadge } from "@/components/JarvisBadge";
import { FabianoBadge } from "@/components/FabianoBadge";
import { SocialProofPopup } from "@/components/SocialProofPopup";
import { MobileFrame } from "@/components/MobileFrame";
import { FaqSection } from "@/components/FaqSection";
import { MysteryBoxRedeem } from "@/components/MysteryBoxRedeem";
import { PlansShowcaseProvider, ShowcaseTrigger, ShowcaseShell } from "@/components/PlansShowcase";
import { ExitRecoveryModal } from "@/components/ExitRecoveryModal";
import { useExitIntent } from "@/hooks/useExitIntent";
import { useScrolledPast } from "@/hooks/useScroll";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Wrench,
} from "lucide-react";
import { useBlockedMap, isBlocked } from "@/hooks/useBlockedMap";
import { useBestsellers } from "@/hooks/useBestsellers";


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
import CardPayOption from "@/components/CardPayOption";
import { z } from "zod";
import { criarPedido } from "@/lib/pedidos.functions";
import { trackInitiateCheckout, trackViewContent, trackAddToCart } from "@/lib/tiktok-pixel";

import { OrderBumpDialog, findUpgrade } from "@/components/OrderBumpDialog";
import { simulatePurchase } from "@/lib/simulate-purchase.functions";
import { getUtmParams } from "@/lib/utm";
import { trackFunnel } from "@/lib/funnel-beacon";
import { getPedidoStatus } from "@/lib/admin.functions";
import { CheckCircle2 } from "lucide-react";

import { DelayedCouponField, getAppliedCoupon } from "@/components/CouponField";
import { TrustBadges } from "@/components/TrustBadges";
import { LivePurchasesTicker } from "@/components/LivePurchasesTicker";
import { CheckoutFaq } from "@/components/CheckoutFaq";
import { PremiumCategorySelector } from "@/components/PremiumCategorySelector";
import { PremiumPricingGrid } from "@/components/PremiumPricingGrid";
import { getPricingGrid, getBrPricingGrid } from "@/lib/pricing.functions";
import { BrandHeader } from "@/components/BrandHeader";



// Analytics: dispara evento p/ gtag, dataLayer (GTM) e fbq, sem quebrar se nenhum existir.
type TrackPayload = Record<string, string | number | boolean | undefined>;
function trackEvent(name: string, payload: TrackPayload = {}) {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as {
      gtag?: (...a: unknown[]) => void;
      dataLayer?: unknown[];
      fbq?: (...a: unknown[]) => void;
      ttq?: { track: (n: string, p?: unknown, opts?: { event_id?: string }) => void; page?: () => void };
    };
    w.gtag?.("event", name, payload);
    w.dataLayer?.push({ event: name, ...payload });
    w.fbq?.("trackCustom", name, payload);
    // TikTok Pixel: mapeia p/ eventos padrão quando aplicável
    const ttqMap: Record<string, string> = {
      checkout_submit: "InitiateCheckout",
      purchase: "CompletePayment",
    };
    const ttqEvent = ttqMap[name] ?? name;
    const value = typeof payload.value === "number" ? payload.value
      : typeof payload.plan_value === "number" ? payload.plan_value
      : undefined;
    const ttqOptions =
      name === "purchase" && (typeof payload.order_id === "string" || typeof payload.order_id === "number")
        ? { event_id: `cp_${payload.order_id}` }
        : undefined;
    w.ttq?.track(ttqEvent, value !== undefined ? { value, currency: "BRL", ...payload } : payload, ttqOptions);
    if (import.meta.env.DEV) console.debug("[track]", name, payload);
  } catch (err) {
    console.error("[trackEvent]", err);
  }
}


export const Route = createFileRoute("/")({
  head: () => {
    const title = "Comprar Seguidores Instagram Reais via Pix — BoostGG";
    const ogTitle = "BoostGG — Seguidores no Instagram Reais e Brasileiros";
    const description =
      "Comprar seguidores Instagram reais via Pix com entrega imediata. Seguidores brasileiros com alta retenção e reposição garantida. Elite Boost Prime: autoridade e segurança.";
    // v302 — www é a versão que o Google escolheu como canônica ("googleCanonical").
    // Apontar a canonical para a versão sem www fazia o Google ignorar nossa
    // marcação e usar a dele. Agora as duas batem.
    const url = "https://www.boostgg.com.br/";
    const ogImage = `https://www.boostgg.com.br${ogInstagram}?v=49`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { name: "google-site-verification", content: "y8Z87vQybaocMrzCC4Zzur2UBFi7VEGWAfdklGB2opM" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1216" },
        { property: "og:image:height", content: "640" },
        { property: "og:image:alt", content: "Elite Boost Prime — Seguidores Brasileiros no Instagram via Pix" },
        { property: "og:site_name", content: "BoostGG" },
        { property: "og:locale", content: "pt_BR" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
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
                "@id": "https://www.boostgg.com.br/#organization",
                name: "BoostGG",
                url: "https://www.boostgg.com.br/",
                logo: ogImage,
                description,
                sameAs: [],
                taxID: "47363210000108",
                identifier: { "@type": "PropertyValue", propertyID: "CNPJ", value: "47363210000108" },
              },
              {
                "@type": "WebSite",
                "@id": "https://www.boostgg.com.br/#website",
                url: "https://www.boostgg.com.br/",
                name: "BoostGG",
                inLanguage: "pt-BR",
                publisher: { "@id": "https://www.boostgg.com.br/#organization" },
              },
              // v302 — O nó Service foi REMOVIDO de propósito.
              // O Google reportou "Review snippets: tipo de objeto do campo
              // <parent_node> não é válido" apontando para o item
              // "Compra de Seguidores no Instagram". Causa: Service não é um
              // tipo que aceita nota/avaliação; como Service e Product
              // descreviam a MESMA página, o Google colava a nota do Product
              // no Service e invalidava o rich snippet inteiro.
              // Ponto único de verdade: só o Product carrega oferta + nota.

              {
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "Os seguidores são brasileiros?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Sim. Entregamos seguidores com perfis brasileiros, com entrega imediata via Pix.",
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
                "@id": "https://www.boostgg.com.br/#product",
                name: "Seguidores para Instagram - BoostGG",
                description,
                brand: { "@type": "Brand", name: "BoostGG" },
                image: ogImage,
                // Oferta herdada do antigo nó Service (v302): rich snippet de
                // preço + nota agora vivem no mesmo item suportado.
                offers: {
                  "@type": "AggregateOffer",
                  priceCurrency: "BRL",
                  lowPrice: "5.00",
                  highPrice: "499.00",
                  offerCount: "9",
                  availability: "https://schema.org/InStock",
                  url: "https://www.boostgg.com.br/",
                },
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
  { id: "p100",   tier: "100 Seguidores",     tag: "+ MINI",     qty: "100",     quantidade: 100,    valor: 5.0,   price: "R$ 5,00",   benefit: "Seguidores Reais via Pix" },
  { id: "p500",   tier: "500 Seguidores",     tag: "+ STARTER",  qty: "500",     quantidade: 500,    valor: 12.0,  price: "R$ 12,00",  benefit: "Seguidores Reais Brasil" },
  { id: "p1k",    tier: "1.000 Seguidores",   tag: "+ BASIC",    qty: "1.000",   quantidade: 1000,   valor: 18.0,  price: "R$ 18,00",  benefit: "Comprar Seguidores Reais" },
  { id: "p2k",    tier: "2.000 Seguidores",   tag: "+ GROWTH",   qty: "2.000",   quantidade: 2000,   valor: 30.0,  price: "R$ 30,00",  benefit: "Entrega rápida e segura" },
  { id: "p5k",    tier: "5.000 Seguidores",   tag: "+ PRO",      qty: "5.000",   quantidade: 5000,   valor: 65.0,  price: "R$ 65,00",  benefit: "Entrega rápida e segura" },
  { id: "p10k",   tier: "10.000 Seguidores",  tag: "+ VIP",      qty: "10.000",  quantidade: 10000,  valor: 120.0, price: "R$ 120,00", benefit: "Mais recomendado pelos clientes", highlight: true },
  { id: "p20k",   tier: "20.000 Seguidores",  tag: "+ ELITE",    qty: "20.000",  quantidade: 20000,  valor: 220.0, price: "R$ 220,00", benefit: "Entrega rápida e segura" },
  { id: "p50k",   tier: "50.000 Seguidores",  tag: "+ MASTER",   qty: "50.000",  quantidade: 50000,  valor: 490.0, price: "R$ 490,00", benefit: "Entrega rápida e segura" },
  { id: "p100k",  tier: "100.000 Seguidores", tag: "+ ULTIMATE", qty: "100.000", quantidade: 100000, valor: 890.0, price: "R$ 890,00", benefit: "Entrega rápida e segura" },
];

const likesPlans: Plan[] = [
  { id: "l100", tier: "100 Curtidas",   tag: "+ MINI",    qty: "100",   quantidade: 100,  valor: 3.0,  price: "R$ 3,00",  benefit: "Entrega rápida em qualquer post" },
  { id: "l100_v2", tier: "100 Curtidas",   tag: "IMPULSO",   qty: "100",   quantidade: 100,  valor: 9.9,  price: "R$ 9,90",  benefit: "Entrega relâmpago" },
  { id: "l250_v2", tier: "250 Curtidas",   tag: "POPULAR",   qty: "250",   quantidade: 250,  valor: 14.9, price: "R$ 14,90", benefit: "Melhor custo-benefício" },
  { id: "l500_v2", tier: "500 Curtidas",   tag: "STARTER",   qty: "500",   quantidade: 500,  valor: 19.9, price: "R$ 19,90", benefit: "Engajamento real" },
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
  { icon: Zap, title: "Entrega via Pix em Minutos", desc: "Processamento automático em minutos após a aprovação do Pix. Seguidores reais direto na sua conta." },
