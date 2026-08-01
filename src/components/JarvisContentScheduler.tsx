import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateFacelessScript as genScriptFn } from "@/lib/jarvis-script-gen.functions";
import jarvisBgAsset from "@/assets/jarvis-bg.mp4.asset.json";
import { FacelessVideoStudio } from "@/components/FacelessVideoStudio";

type Network = "instagram" | "tiktok" | "facebook" | "youtube" | "telegram";
type Format = "1:1" | "9:16";

type Draft = {
  id: string;
  post_date: string;
  image_url: string | null;
  caption_text: string;
  status: string;
  network: Network;
  format: Format;
};

const NETWORKS: { id: Network; label: string; icon: string; ring: string }[] = [
  { id: "instagram", label: "Instagram", icon: "📸", ring: "ring-fuchsia-500/60" },
  { id: "tiktok",    label: "TikTok",    icon: "🎵", ring: "ring-cyan-400/60" },
  { id: "facebook",  label: "Facebook",  icon: "🔵", ring: "ring-blue-500/60" },
  { id: "youtube",   label: "YT Shorts", icon: "📺", ring: "ring-red-500/60" },
  { id: "telegram",  label: "Telegram",  icon: "✈️", ring: "ring-sky-400/60" },
];

const HASHTAGS: Record<Network, string> = {
  instagram: "#instagram #seguidores #crescernoinsta #marketingdigital #eliteboostprime",
  tiktok:    "#tiktok #viral #fyp #foryou #tiktokbrasil #eliteboostprime",
  facebook:  "#facebook #marketingfb #engajamento #eliteboostprime",
  youtube:   "#youtube #shorts #inscritos #criadordeconteudo #eliteboostprime",
  telegram:  "#telegram #grupotelegram #canal #eliteboostprime",
};

export function JarvisContentScheduler() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [networks, setNetworks] = useState<Network[]>(["instagram"]);
  const [format, setFormat] = useState<Format>("9:16");
  const [script, setScript] = useState<{ hook: string; retention: string; cta: string } | null>(null);
  const [bgVideo, setBgVideo] = useState<string>(jarvisBgAsset.url);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const toggleNet = (n: Network) =>
    setNetworks((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("id, post_date, image_url, caption_text, status, network, format")
      .order("post_date", { ascending: false })
      .limit(30);
    if (error) setErr(error.message);
    else setDrafts((data as Draft[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("scheduled_posts_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const runGenScript = useServerFn(genScriptFn);
  const [genLoading, setGenLoading] = useState(false);

  const generateFacelessScript = async () => {
    const target = networks[0] ?? "instagram";
    setGenLoading(true);
    setErr(null);
    try {
      const r = await runGenScript({ data: { network: target, format } });
      const s = { hook: r.hook, retention: r.retention, cta: r.cta };
      setScript(s);
      setCaption(`${s.hook}\n\n${s.retention}\n\n${s.cta}\n\n${r.hashtags ?? HASHTAGS[target]}`);
      toast.success("Roteiro gerado. Copie e cole na sua rede.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao gerar roteiro");
    } finally {
      setGenLoading(false);
    }
  };

  const copyCaption = async () => {
    if (!caption.trim()) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 1500);
      toast.success("Legenda copiada. Cole no app da rede.");
    } catch {
      toast.error("Não consegui copiar — selecione o texto manualmente.");
    }
  };

  const saveDraft = async () => {
    if (networks.length === 0) { toast.error("Selecione ao menos 1 rede."); return; }
    if (!caption.trim()) { toast.error("Gere ou escreva a legenda primeiro."); return; }
    setSaving(true); setErr(null);
    const now = new Date().toISOString();
    const rows = networks.map((n) => ({
      post_date: now,
      image_url: imageUrl || null,
      caption_text: caption,
      status: "draft",
      network: n,
      format,
      approved: false,
      approval_token: crypto.randomUUID(),
    }));
    const { error } = await supabase.from("scheduled_posts").insert(rows);
    setSaving(false);
    if (error) { setErr(error.message); toast.error(`Falha ao salvar: ${error.message}`); return; }
    toast.success(`Rascunho salvo (${rows.length}). Acesse pela biblioteca abaixo pra reutilizar.`);
    await load();
  };

  const loadDraft = (d: Draft) => {
    setCaption(d.caption_text);
    setImageUrl(d.image_url ?? "");
    setFormat(d.format);
    setNetworks([d.network]);
    setScript(null);
    toast.success("Rascunho carregado no editor.");
  };

  const copyDraft = async (d: Draft) => {
    try {
      await navigator.clipboard.writeText(d.caption_text);
      toast.success("Legenda copiada.");
    } catch {
      toast.error("Falha ao copiar.");
    }
  };

  const remove = async (id: string) => {
    await supabase.from("scheduled_posts").delete().eq("id", id);
    await load();
  };

  const ratio = format === "1:1" ? "aspect-square" : "aspect-[9/16]";

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-card/60 p-6 space-y-5 backdrop-blur-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">🤖 Copy Studio J.A.R.V.I.S.</h2>
          <p className="text-[11px] text-white/60 mt-0.5">
            Gera roteiro Faceless (Gancho · Retenção · CTA) + legenda + hashtags + link UTM. Você copia e posta na mão na rede escolhida.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-cyan-300/80">
          {drafts.length} rascunhos salvos
        </span>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/90">
        <b>Modo honesto:</b> este módulo NÃO publica automaticamente nas redes (evita ban de conta nova). Ele gera copy profissional e mantém uma biblioteca de rascunhos pra você postar manualmente. Publicação automática entra quando o chip warmup Meta/TikTok estiver pronto.
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Editor */}
        <div className="space-y-3">
          {/* Networks */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">🌐 Rede alvo (define hashtags e CTA)</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {NETWORKS.map((n) => {
                const on = networks.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => toggleNet(n.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
                      on
                        ? `bg-black/60 text-white ring-2 ${n.ring} border-white/20`
                        : "bg-black/30 text-white/60 border-white/10 hover:text-white"
                    }`}
                  >
                    {n.icon} {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">📐 Formato</label>
            <div className="mt-1 flex gap-1.5">
              {(["1:1", "9:16"] as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1 rounded-lg text-[11px] border ${
                    format === f
                      ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/50"
                      : "bg-black/30 text-white/60 border-white/10"
                  }`}
                >
                  {f === "1:1" ? "Feed 1:1" : "Shorts/Reels 9:16"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">🖼️ URL da Imagem (opcional, pra preview)</label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">📝 Legenda</label>
            <button
              type="button"
              onClick={generateFacelessScript}
              disabled={genLoading}
              className="mt-1 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-400 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(34,211,238,0.5)] border border-cyan-300/60 hover:brightness-110 disabled:opacity-40"
            >
              🤖 {genLoading ? "Gerando com IA…" : "Gerar Roteiro Faceless (Gancho · Retenção · CTA)"}
            </button>
            <textarea
              rows={7}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Clique acima para gerar com IA ou escreva manualmente..."
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-mono"
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={copyCaption}
                disabled={!caption.trim()}
                className="rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider hover:bg-emerald-500/30 disabled:opacity-40"
              >
                📋 {copiedCaption ? "Copiado!" : "Copiar Legenda"}
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving || !caption.trim() || networks.length === 0}
                className="rounded-xl bg-black/60 border border-cyan-400/40 text-cyan-200 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider hover:bg-black/80 disabled:opacity-40"
              >
                💾 {saving ? "Salvando…" : `Salvar Rascunho (${networks.length})`}
              </button>
            </div>
          </div>

          {/* UTM Link Generator */}
          <UtmLinkGenerator networks={networks} format={format} />

          {err && <div className="text-xs text-red-400">{err}</div>}
        </div>

        {/* Mockup preview */}
        <div className="space-y-3">
          {script && (
            <div className="rounded-xl border border-amber-400/40 bg-black/60 p-3 text-[11px] space-y-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300">🎬 Roteiro Faceless · IA</div>
              <div><span className="text-cyan-300 font-bold">⚡ Gancho 3s:</span> <span className="text-white/90">{script.hook}</span></div>
              <div><span className="text-fuchsia-300 font-bold">🎯 Retenção:</span> <span className="text-white/90">{script.retention}</span></div>
              <div><span className="text-emerald-300 font-bold">💰 CTA:</span> <span className="text-white/90">{script.cta}</span></div>
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">🎥 Vídeo de Fundo (loop preview)</label>
            <input
              type="url"
              value={bgVideo}
              onChange={(e) => setBgVideo(e.target.value)}
              placeholder="https://...mp4"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs"
            />
          </div>
          <FacelessVideoStudio script={script} format={format} bgVideoUrl={bgVideo || undefined} />

          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            📱 Preview visual ({format})
          </div>
          <div className={`rounded-xl border-2 border-red-500/40 bg-black/80 overflow-hidden shadow-[0_0_30px_rgba(255,0,40,0.25)] ${format === "9:16" ? "max-w-[280px] mx-auto" : ""}`}>
            <div className="flex items-center gap-2 p-2.5 border-b border-cyan-400/20 bg-gradient-to-r from-black to-red-950/40">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-red-500 via-fuchsia-500 to-cyan-400" />
              <div className="text-xs font-bold text-cyan-200">eliteboostprime</div>
              <div className="ml-auto text-[9px] text-white/40 uppercase tracking-wider">{format}</div>
            </div>
            <div className={`${ratio} bg-black flex items-center justify-center relative overflow-hidden`}>
              {bgVideo ? (
                <video src={bgVideo} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
              ) : null}
              {imageUrl && (
                <img src={imageUrl} alt="Prévia do criativo" className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {script && (
                <div className="relative z-10 px-4 text-center">
                  <div className="text-white text-base sm:text-lg font-black drop-shadow-[0_0_12px_rgba(0,242,254,0.8)] uppercase">
                    {script.hook}
                  </div>
                </div>
              )}
              <div className="absolute inset-0 ring-1 ring-inset ring-cyan-400/20 pointer-events-none" />
            </div>
            <div className="p-2.5 text-[11px] whitespace-pre-wrap min-h-[50px] text-white/90 max-h-40 overflow-y-auto">
              {caption || <span className="text-white/40">Gere o roteiro para preencher legenda + hashtags…</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Biblioteca de rascunhos */}
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">📚 Biblioteca de Rascunhos</div>
        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando...</div>
        ) : drafts.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum rascunho salvo. Gere um roteiro acima e clique em "Salvar Rascunho".</div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {drafts.map((p) => {
              const net = NETWORKS.find((n) => n.id === p.network);
              return (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs">
                  <span className="w-24 text-[10px] uppercase tracking-wider text-cyan-300">{net?.icon} {net?.label ?? p.network}</span>
                  <span className="w-12 text-[10px] text-white/50">{p.format}</span>
                  <div className="w-32 tabular-nums text-cyan-300/80 text-[10px]">{new Date(p.post_date).toLocaleDateString("pt-BR")}</div>
                  <div className="flex-1 truncate">{p.caption_text.split("\n")[0]}</div>
                  <button onClick={() => loadDraft(p)} className="text-cyan-300 hover:text-cyan-200 text-[10px] uppercase font-bold" title="Carregar no editor">Editar</button>
                  <button onClick={() => copyDraft(p)} className="text-emerald-300 hover:text-emerald-200 text-[10px] uppercase font-bold" title="Copiar legenda">Copiar</button>
                  <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-300" title="Excluir">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// -------- UTM Link Generator (Omnichannel Tracking) --------
type UtmProps = { networks: Network[]; format: Format };

function UtmLinkGenerator({ networks, format }: UtmProps) {
  const BASE_BY_NET: Record<Network, string> = {
    instagram: "https://boostgg.com.br",
    tiktok: "https://boostgg.com.br/tiktok",
    facebook: "https://boostgg.com.br/facebook",
    youtube: "https://boostgg.com.br/youtube",
    telegram: "https://boostgg.com.br/telegram",
  };
  const [selected, setSelected] = useState<Network>(networks[0] ?? "instagram");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (networks[0] && !networks.includes(selected)) setSelected(networks[0]);
  }, [networks, selected]);

  const trackedUrl = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fmt = format === "9:16" ? "reels" : "feed";
    const base = BASE_BY_NET[selected];
    const params = new URLSearchParams({
      utm_source: selected,
      utm_medium: fmt,
      utm_campaign: `jarvis_${date}`,
    });
    return `${base}?${params.toString()}`;
  }, [selected, format]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trackedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const opts: { id: Network; label: string }[] = [
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "facebook", label: "Facebook" },
    { id: "youtube", label: "YouTube" },
    { id: "telegram", label: "Telegram" },
  ];

  return (
    <div className="space-y-2 rounded-xl border border-amber-400/30 bg-black/40 p-3">
      <label className="text-[10px] uppercase tracking-wider text-amber-300/80">
        🎯 Link UTM (rastreia origem da venda no dashboard)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(o.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
              selected === o.id
                ? "bg-amber-500/20 text-amber-200 border-amber-400/60"
                : "bg-black/30 text-white/60 border-white/10 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={trackedUrl}
          className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-[11px] font-mono text-amber-100 select-all"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-200 px-3 py-2 text-[11px] font-bold uppercase hover:bg-amber-500/30"
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <p className="text-[10px] text-white/50">
        Cole este link na bio/descrição do post. Alimenta o painel <b>Top Fontes (utm_source)</b> do admin.
      </p>
    </div>
  );
}
