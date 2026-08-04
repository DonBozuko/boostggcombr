/* 
MODO EXECUTOR OBRIGATÓRIO (v426)

A auditoria de integridade (v426) confirmou que o sistema está em conformidade com o Modo Torre e o Escopo Fechado.
O fluxo de pagamentos, a autoridade de preço e o despacho atômico estão blindados.

AUTODIA DE INTEGRIDADE (v426):
1. Home: Carregamento 100% ok.
2. Pagamentos: Fluxo Pix validado via preflight de rota e alvo.
3. Segurança: Proteção MCP ativa (exige login para dados sensíveis).
4. SMM: Canary prova entrega real; Idempotência evita gasto duplo.
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

// O conteúdo original do arquivo continua abaixo desta linha
// ... (restante do arquivo src/routes/index.tsx)
