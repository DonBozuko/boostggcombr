import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Network = "instagram" | "tiktok" | "facebook" | "youtube" | "telegram";
type Format = "1:1" | "9:16";

type Post = {
  id: string;
  post_date: string;
  image_url: string | null;
  caption_text: string;
  status: string;
  network: Network;
  format: Format;
  approved: boolean;
};

const NETWORKS: { id: Network; label: string; icon: string; ring: string }[] = [
  { id: "instagram", label: "Instagram", icon: "📸", ring: "ring-fuchsia-500/60" },
  { id: "tiktok",    label: "TikTok",    icon: "🎵", ring: "ring-cyan-400/60" },
  { id: "facebook",  label: "Facebook",  icon: "🔵", ring: "ring-blue-500/60" },
  { id: "youtube",   label: "YT Shorts", icon: "📺", ring: "ring-red-500/60" },
  { id: "telegram",  label: "Telegram",  icon: "✈️", ring: "ring-sky-400/60" },
];

export function JarvisContentScheduler() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 16);
  const [postDate, setPostDate] = useState(today);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [networks, setNetworks] = useState<Network[]>(["instagram"]);
  const [format, setFormat] = useState<Format>("1:1");

  const toggleNet = (n: Network) =>
    setNetworks((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("id, post_date, image_url, caption_text, status, network, format, approved")
      .order("post_date", { ascending: true })
      .limit(30);
    if (error) setErr(error.message);
    else setPosts((data as Post[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const aiSuggest = () => {
    const hooks = [
      "🚀 Cresça no automático com a EliteBoost Prime.",
      "🔥 Engajamento real, entrega blindada, suporte 24/7.",
      "💎 Vire referência: Seguidores + Curtidas + Views premium.",
      "⚡ Pix aprovado e bot dispara em segundos. Sem enrolação.",
    ];
    const tags = "#eliteboostprime #crescimentoreal #instagram #tiktok #youtube #facebook";
    setCaption(`${hooks[Math.floor(Math.random() * hooks.length)]}\n\n${tags}`);
  };

  const schedule = async () => {
    if (networks.length === 0) { setErr("Selecione ao menos 1 rede."); return; }
    setSaving(true); setErr(null);
    const rows = networks.map((n) => ({
      post_date: new Date(postDate).toISOString(),
      image_url: imageUrl || null,
      caption_text: caption,
      status: "pending",
      network: n,
      format,
      approved: false,
      approval_token: crypto.randomUUID(),
    }));
    const { error } = await supabase.from("scheduled_posts").insert(rows);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setImageUrl(""); setCaption("");
    await load();
  };

  const remove = async (id: string) => {
    await supabase.from("scheduled_posts").delete().eq("id", id);
    await load();
  };

  const approve = async (id: string) => {
    await supabase.from("scheduled_posts").update({ approved: true, status: "approved" }).eq("id", id);
    await load();
  };

  const ratio = format === "1:1" ? "aspect-square" : "aspect-[9/16]";

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-card/60 p-6 space-y-5 backdrop-blur-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-extrabold tracking-tight">🤖 Central de Conteúdo J.A.R.V.I.S. — Omnichannel</h2>
        <span className="text-[10px] uppercase tracking-wider text-cyan-300/80">
          Modo Seguro · {posts.length} agendados
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Editor */}
        <div className="space-y-3">
          {/* Networks */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">🌐 Redes</label>
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
            <label className="text-xs uppercase tracking-wider text-muted-foreground">📅 Data & Hora</label>
            <input
              type="datetime-local"
              value={postDate}
              onChange={(e) => setPostDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">🖼️ URL da Imagem</label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">📝 Legenda (IA)</label>
              <button onClick={aiSuggest} type="button" className="text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200">
                ✨ Gerar com J.A.R.V.I.S.
              </button>
            </div>
            <textarea
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva ou gere a legenda..."
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            onClick={schedule}
            disabled={saving || !caption.trim() || networks.length === 0}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-red-500 px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-40 shadow-[0_0_24px_rgba(0,242,254,0.35)]"
          >
            {saving ? "Agendando..." : `🛡️ Agendar em modo seguro (${networks.length} rede${networks.length === 1 ? "" : "s"})`}
          </button>
          <p className="text-[10px] text-white/50">
            🔒 Modo Seguro: os posts aguardam aprovação executiva de 1 clique no Telegram do administrador antes do envio real às plataformas.
          </p>
          {err && <div className="text-xs text-red-400">{err}</div>}
        </div>

        {/* Mockup multi-format */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            📱 Pré-visualização ({format}) — J.A.R.V.I.S. Luxury Frame
          </div>
          <div className={`rounded-xl border-2 border-red-500/40 bg-black/80 overflow-hidden shadow-[0_0_30px_rgba(255,0,40,0.25)] ${format === "9:16" ? "max-w-[280px] mx-auto" : ""}`}>
            <div className="flex items-center gap-2 p-2.5 border-b border-cyan-400/20 bg-gradient-to-r from-black to-red-950/40">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-red-500 via-fuchsia-500 to-cyan-400" />
              <div className="text-xs font-bold text-cyan-200">eliteboostprime</div>
              <div className="ml-auto text-[9px] text-white/40 uppercase tracking-wider">{format}</div>
            </div>
            <div className={`${ratio} bg-black flex items-center justify-center relative`}>
              {imageUrl ? (
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-[10px] text-white/40 px-4 text-center">Cole uma URL para visualizar o criativo</div>
              )}
              <div className="absolute inset-0 ring-1 ring-inset ring-cyan-400/20 pointer-events-none" />
            </div>
            <div className="p-2.5 text-[11px] whitespace-pre-wrap min-h-[50px] text-white/90">
              {caption || <span className="text-white/40">A legenda aparecerá aqui...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">🗓️ Agenda Omnichannel</div>
        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando...</div>
        ) : posts.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum post agendado.</div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {posts.map((p) => {
              const net = NETWORKS.find((n) => n.id === p.network);
              return (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs">
                  <span className="w-20 text-[10px] uppercase tracking-wider text-cyan-300">{net?.icon} {net?.label ?? p.network}</span>
                  <span className="w-12 text-[10px] text-white/50">{p.format}</span>
                  <div className="w-36 tabular-nums text-cyan-300/80">{new Date(p.post_date).toLocaleString("pt-BR")}</div>
                  <div className="flex-1 truncate">{p.caption_text.split("\n")[0]}</div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                    p.approved ? "bg-emerald-500/20 text-emerald-300" :
                    p.status === "failed" ? "bg-red-500/20 text-red-300" :
                    "bg-amber-500/20 text-amber-300"
                  }`}>{p.approved ? "aprovado" : p.status}</span>
                  {!p.approved && (
                    <button onClick={() => approve(p.id)} className="text-emerald-300 hover:text-emerald-200" title="Aprovar (Modo Seguro)">✓</button>
                  )}
                  <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-300">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
