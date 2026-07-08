// v183 — Order Bump: oferece upgrade pro próximo tier com 20% off antes do Pix.
// Desconto sai da margem de 80-87% do multiplicador escalar, matematicamente
// impossível de dar prejuízo (base já cobre custo+Pix+buffer 15%).
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/profit-markup";
import { Sparkles, TrendingUp } from "lucide-react";

export type BumpPlan = {
  id: string;
  quantidade: number;
  valor: number;
  price: string;
  tier: string;
};

export type BumpUpgrade = {
  plan: BumpPlan;
  discountedValor: number;
  discountedPrice: string;
  economyPct: number;
  extraUnits: number;
};

export function findUpgrade(current: BumpPlan, allPlans: BumpPlan[]): BumpUpgrade | null {
  const prefix = current.id.match(/^[a-z]+/)?.[0] ?? "";
  const next = allPlans
    .filter((p) => p.id.startsWith(prefix) && p.quantidade > current.quantidade)
    .sort((a, b) => a.quantidade - b.quantidade)[0];
  if (!next) return null;
  const discountedValor = Number((next.valor * 0.80).toFixed(2));
  const perUnitCurrent = current.valor / current.quantidade;
  const perUnitBump = discountedValor / next.quantidade;
  const economyPct = Math.max(0, Math.round((1 - perUnitBump / perUnitCurrent) * 100));
  return {
    plan: next,
    discountedValor,
    discountedPrice: formatBRL(discountedValor),
    economyPct,
    extraUnits: next.quantidade - current.quantidade,
  };
}

export function OrderBumpDialog({
  open,
  current,
  allPlans,
  unitLabel,
  onAccept,
  onDecline,
  loading,
}: {
  open: boolean;
  current: BumpPlan | null;
  allPlans: BumpPlan[];
  unitLabel: string;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}) {
  if (!current) return null;
  const up = findUpgrade(current, allPlans);
  if (!up) return null;

  const fmtNum = (n: number) => n.toLocaleString("pt-BR");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onDecline(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Oferta única — só aparece agora
          </DialogTitle>
          <DialogDescription className="text-base">
            Aumente para <strong className="text-foreground">{fmtNum(up.plan.quantidade)} {unitLabel}</strong> por apenas{" "}
            <strong className="text-primary">{up.discountedPrice}</strong>.
            {up.economyPct > 0 && (
              <span className="block mt-1 text-sm">
                <TrendingUp className="inline h-4 w-4 mr-1" />
                {up.economyPct}% mais barato por unidade.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Seu pedido:</span>
            <span className="line-through opacity-60">{fmtNum(current.quantidade)} por {current.price}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Upgrade Prime:</span>
            <span className="font-bold text-primary text-lg">{fmtNum(up.plan.quantidade)} por {up.discountedPrice}</span>
          </div>
          <div className="text-xs text-center pt-1 text-muted-foreground">
            +{fmtNum(up.extraUnits)} {unitLabel} extras entregues no mesmo pedido
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={onAccept} disabled={loading} size="lg" className="w-full font-bold">
            ✅ SIM! Quero o upgrade por {up.discountedPrice}
          </Button>
          <Button onClick={onDecline} disabled={loading} variant="ghost" size="sm" className="w-full">
            Não, continuar com {fmtNum(current.quantidade)} por {current.price}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
