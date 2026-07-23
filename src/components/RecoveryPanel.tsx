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
  email: string | null;
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

/** Extrai handle limpo de qualquer coisa colada pelo cliente (URL, @, etc). */
function parseHandle(raw: string | null): { handle: string; platform: "instagram" | "tiktok" | "youtube" | "kwai" | "facebook" | null; rawUrl: string | null } {
  const s = (raw ?? "").trim();
  if (!s) return { handle: "", platform: null, rawUrl: null };
  let platform: "instagram" | "tiktok" | "youtube" | "kwai" | "facebook" | null = null;
  if (/tiktok\.com/i.test(s)) platform = "tiktok";
  else if (/instagram\.com/i.test(s)) platform = "instagram";
  else if (/youtube\.com|youtu\.be/i.test(s)) platform = "youtube";
  else if (/kwai\.com/i.test(s)) platform = "kwai";
  else if (/facebook\.com|fb\.com/i.test(s)) platform = "facebook";
  const rawUrl = /^https?:\/\//i.test(s) ? s : null;
  // pega último segmento com @handle ou path final
  const m = s.match(/@([A-Za-z0-9._-]+)/) ?? s.match(/\/([A-Za-z0-9._-]+)\/?(?:\?|$)/);
  const handle = (m?.[1] ?? s.replace(/^@/, "").split(/[/?#]/).pop() ?? "").trim();
  return { handle, platform, rawUrl };
}

function networkToPlatform(rede: string | null): "instagram" | "tiktok" | "youtube" | "kwai" | "facebook" | null {
  const r = (rede ?? "").toLowerCase();
  if (r.includes("tiktok")) return "tiktok";
  if (r.includes("insta")) return "instagram";
  if (r.includes("youtube")) return "youtube";
  if (r.includes("kwai")) return "kwai";
  if (r.includes("face")) return "facebook";
  return null;
}

function buildMessage(r: Row): string {
  const { handle } = parseHandle(r.instagram_user);
  const nome = handle ? `@${handle}` : "olá";
  return (
    `Oi ${nome}! 👋\n\n` +
    `Vi aqui que você começou um pedido na BoostGG (${r.pacote ?? "impulso"}) mas o Pix ficou pendente. ` +
    `Deu tudo certo? Se precisar de ajuda ou um novo link de pagamento, é só responder aqui — libero na hora! 🚀`
  );
}

function buildWhatsappUrl(r: Row): string | null {
  const digits = (r.whatsapp ?? "").replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(buildMessage(r))}`;
}

function buildProfileUrl(r: Row): string | null {
  const parsed = parseHandle(r.instagram_user);
  if (parsed.rawUrl) return parsed.rawUrl;
  if (!parsed.handle) return null;
  const platform = parsed.platform ?? networkToPlatform(r.rede_social) ?? "instagram";
  const h = parsed.handle.replace(/^@/, "");
  switch (platform) {
    case "tiktok": return `https://www.tiktok.com/@${h}`;
    case "youtube": return `https://www.youtube.com/@${h}`;
    case "kwai": return `https://www.kwai.com/@${h}`;
    case "facebook": return `https://www.facebook.com/${h}`;
    default: return `https://www.instagram.com/${h}/`;
  }
}

function buildEmailUrl(r: Row): string | null {
  if (!r.email) return null;
  const subject = `BoostGG — seu pedido ${r.pacote ?? ""} ficou pendente`;
  const body = buildMessage(r);
  return `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  async function contact(r: Row, channel: "whatsapp" | "profile" | "email") {
    const url = channel === "whatsapp" ? buildWhatsappUrl(r) : channel === "email" ? buildEmailUrl(r) : buildProfileUrl(r);
    const labelMap = { whatsapp: "WhatsApp", profile: "perfil", email: "email" } as const;
    if (!url) { toast.error(`Sem ${labelMap[channel]} cadastrado`); return; }
    if (channel === "email") window.location.href = url;
    else window.open(url, "_blank", "noopener");
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
            const parsed = parseHandle(r.instagram_user);
            const hasProfile = !!(parsed.handle || parsed.rawUrl);
            const hasEmail = !!r.email;
            const platform = parsed.platform ?? networkToPlatform(r.rede_social);
            const profileLabel = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Perfil";
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-semibold">
                    {brl(r.valor)} · <span className="text-neutral-300">{r.pacote ?? "—"}</span>
                    {r.rede_social && <span className="text-xs text-neutral-500 ml-2">({r.rede_social})</span>}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5 break-all">
                    {parsed.handle && <span>@{parsed.handle}</span>}
                    {hasWpp && <span className="ml-2">📱 {r.whatsapp}</span>}
                    {hasEmail && <span className="ml-2">✉️ {r.email}</span>}
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
                    title={hasWpp ? "Abrir WhatsApp com mensagem pronta" : "Sem WhatsApp cadastrado"}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    className="bg-pink-600 hover:bg-pink-500 text-white h-8"
                    onClick={() => contact(r, "profile")}
                    disabled={!hasProfile}
                    title={hasProfile ? `Abrir perfil ${profileLabel}` : "Sem perfil"}
                  >
                    {profileLabel}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-500 text-white h-8"
                    onClick={() => contact(r, "email")}
                    disabled={!hasEmail}
                    title={hasEmail ? "Abrir email com mensagem pronta" : "Sem email cadastrado"}
                  >
                    Email
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
