import { useEffect, useState } from "react";
import { getRecoveryQueue, markRecoveryContacted, dismissRecovery, getRecoveryStats } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = {
  id: number;
  pedido_id: string;
  mercado_pago_id: string | null;
  valor: number;
  rede_social: string | null;
  pacote: string | null;
  whatsapp: string | null;
  instagram_user: string | null;
  status: string;
  attempts: number;
  first_seen_at: string;
  contacted_at: string | null;
};

function brl(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function timeAgo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function buildMessage(r: Row): string {
  const nome = r.instagram_user ? `@${r.instagram_user.replace(/^@/, "")}` : "olá";
  return (
    `Oi ${nome}! 👋\n\n` +
    `Vi aqui que você começou um pedido na BoostGG (${r.pacote ?? "impulso"}) mas o Pix ficou pendente. ` +
    `Deu tudo certo? Se precisar de ajuda ou um novo link de pagamento, é só responder aqui — libero na hora! 🚀`
  );
}

function buildWhatsappUrl(r: Row): string | null {
  const digits = (r.whatsapp ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(buildMessage(r))}`;
}

function buildInstagramUrl(r: Row): string | null {
  const u = (r.instagram_user ?? "").replace(/^@/, "").trim();
  if (!u) return null;
  return `https://www.instagram.com/${u}/`;
}

export function RecoveryPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totalValor, setTotalValor] = useState(0);
  const [stats, setStats] = useState<{ novo: number; contatado: number; recuperado: number; descartado: number; valor_recuperado: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [q, s] = await Promise.all([
        getRecoveryQueue({ data: { token } }),
        getRecoveryStats({ data: { token } }),
      ]);
      if (q.ok) { setRows(q.rows as Row[]); setTotalValor(q.totalValor); }
      if (s.ok) setStats(s.stats);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  async function contact(r: Row, channel: "whatsapp" | "instagram") {
    const url = channel === "whatsapp" ? buildWhatsappUrl(r) : buildInstagramUrl(r);
    if (!url) { toast.error(`Sem ${channel === "whatsapp" ? "WhatsApp" : "Instagram"} cadastrado`); return; }
    window.open(url, "_blank", "noopener");
    const res = await markRecoveryContacted({ data: { token, id: r.id } });
    if (res.ok) { toast.success("Marcado como contatado"); load(); }
    else toast.error(res.error ?? "erro");
  }

  async function dismiss(r: Row) {
    const res = await dismissRecovery({ data: { token, id: r.id, reason: "manual" } });
    if (res.ok) { toast.success("Removido da fila"); load(); }
    else toast.error(res.error ?? "erro");
  }

  if (!token) return null;

  return (
    <Card className="p-4 md:p-6 border-emerald-500/30 bg-gradient-to-br from-black/60 to-emerald-950/20">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-400/80">Growth · Etapa 2</div>
          <h3 className="text-lg font-bold text-white">Central de Recuperação de Pix</h3>
          <p className="text-xs text-neutral-400">Pix pendente há 15min–24h. 1 clique envia mensagem pronta.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? "…" : "Atualizar"}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Metric label="Na fila" value={String(rows.length)} highlight={rows.length > 0} />
        <Metric label="Valor em risco" value={brl(totalValor)} highlight={totalValor > 0} />
        <Metric label="Recuperado 30d" value={String(stats?.recuperado ?? 0)} />
        <Metric label="R$ recuperado 30d" value={brl(stats?.valor_recuperado ?? 0)} />
        <Metric label="Descartado 30d" value={String(stats?.descartado ?? 0)} />
      </div>

      {rows.length === 0 && (
        <div className="text-sm text-neutral-500 py-6 text-center">Fila vazia. 🎯</div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => {
            const hasWpp = !!(r.whatsapp && r.whatsapp.replace(/\D/g, "").length >= 8);
            const hasIg = !!(r.instagram_user && r.instagram_user.trim().length > 0);
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-semibold">
                    {brl(r.valor)} · <span className="text-neutral-300">{r.pacote ?? "—"}</span>
                    {r.rede_social && <span className="text-xs text-neutral-500 ml-2">({r.rede_social})</span>}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {hasIg && <span>@{r.instagram_user}</span>}
                    {hasWpp && <span className="ml-2">📱 {r.whatsapp}</span>}
                    <span className="ml-2 text-neutral-500">
                      há {timeAgo(r.first_seen_at)} · tentativas: {r.attempts}
                      {r.status === "contatado" && r.contacted_at && ` · contatado há ${timeAgo(r.contacted_at)}`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-500 text-white h-8"
                    onClick={() => contact(r, "whatsapp")}
                    disabled={!hasWpp}
                    title={hasWpp ? "Abrir WhatsApp" : "Sem WhatsApp cadastrado"}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    className="bg-pink-600 hover:bg-pink-500 text-white h-8"
                    onClick={() => contact(r, "instagram")}
                    disabled={!hasIg}
                  >
                    Instagram
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-neutral-400" onClick={() => dismiss(r)}>
                    Descartar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${highlight ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 bg-white/5"}`}>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400">{label}</div>
      <div className={`text-base font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</div>
    </div>
  );
}
