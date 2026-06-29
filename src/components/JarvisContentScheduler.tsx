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
  const [format, setFormat] = useState<Format>("9:16");
  const [script, setScript] = useState<{ hook: string; retention: string; cta: string } | null>(null);
  const [bgVideo, setBgVideo] = useState<string>("https://cdn.pixabay.com/video/2023/10/14/185247-874976358_large.mp4");
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);

  const downloadCompiled = async () => {
    if (!bgVideo || downloading) return;
    setDownloading(true); setDownloadPct(0); setErr(null);
    try {
      const isVertical = format === "9:16";
      const W = isVertical ? 720 : 1080;
      const H = isVertical ? 1280 : 1080;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = bgVideo;
      video.muted = true; video.loop = true; video.playsInline = true;
      await new Promise<void>((res, rej) => {
        video.onloadeddata = () => res();
        video.onerror = () => rej(new Error("Falha ao carregar vídeo de fundo (CORS?)"));
      });
      await video.play();

      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const hook = (script?.hook ?? caption.split("\n")[0] ?? "ELITEBOOST PRIME").toUpperCase();
      const cta = script?.cta ?? "eliteboostprime.lovable.app · PRIME15";
      const DUR = 6000;
      const start = performance.now();
      let raf = 0;
      const draw = () => {
        const t = performance.now() - start;
        const pct = Math.min(100, Math.round((t / DUR) * 100));
        setDownloadPct(pct);
        // background video cover
        const vr = video.videoWidth / video.videoHeight;
        const cr = W / H;
        let sw = video.videoWidth, sh = video.videoHeight, sx = 0, sy = 0;
        if (vr > cr) { sw = sh * cr; sx = (video.videoWidth - sw) / 2; }
        else { sh = sw / cr; sy = (video.videoHeight - sh) / 2; }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
        // dark gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "rgba(0,0,0,0.15)");
        grad.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        // hook
        ctx.textAlign = "center";
        ctx.fillStyle = "#00f2fe";
        ctx.shadowColor = "rgba(0,242,254,0.85)";
        ctx.shadowBlur = 24;
        ctx.font = `900 ${Math.round(W * 0.075)}px system-ui, sans-serif`;
        wrapText(ctx, hook, W / 2, H * 0.45, W * 0.85, Math.round(W * 0.09));
        // cta
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 ${Math.round(W * 0.035)}px system-ui, sans-serif`;
        wrapText(ctx, cta, W / 2, H * 0.82, W * 0.85, Math.round(W * 0.045));
        ctx.shadowBlur = 0;
        // brand
        ctx.fillStyle = "#fe0979";
        ctx.font = `800 ${Math.round(W * 0.028)}px system-ui, sans-serif`;
        ctx.fillText("ELITEBOOST PRIME", W / 2, H * 0.93);

        if (t < DUR) raf = requestAnimationFrame(draw);
        else rec.stop();
      };
      rec.start();
      raf = requestAnimationFrame(draw);

      const blob: Blob = await new Promise((res) => {
        rec.onstop = () => res(new Blob(chunks, { type: "video/webm" }));
      });
      cancelAnimationFrame(raf);
      video.pause();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eliteboost-${networks[0] ?? "media"}-${Date.now()}.webm`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao compilar mídia");
    } finally {
      setDownloading(false);
      setDownloadPct(0);
    }
  };

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

  useEffect(() => {
    load();
    const ch = supabase
      .channel("scheduled_posts_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const ROUTE_BY_NET: Record<Network, { url: string; pitch: string }> = {
    instagram: { url: "eliteboostprime.lovable.app",          pitch: "seguidores reais no Instagram" },
    tiktok:    { url: "eliteboostprime.lovable.app/tiktok",   pitch: "views virais no TikTok" },
    facebook:  { url: "eliteboostprime.lovable.app/facebook", pitch: "curtidas blindadas no Facebook" },
    youtube:   { url: "eliteboostprime.lovable.app/youtube",  pitch: "inscritos premium no YouTube" },
    telegram:  { url: "eliteboostprime.lovable.app/telegram", pitch: "membros ativos no Telegram" },
  };

  const HASHTAGS: Record<Network, string> = {
    instagram: "#instagram #seguidores #crescernoinsta #marketingdigital #eliteboostprime",
    tiktok:    "#tiktok #viral #fyp #foryou #tiktokbrasil #eliteboostprime",
    facebook:  "#facebook #marketingfb #engajamento #eliteboostprime",
    youtube:   "#youtube #shorts #inscritos #criadordeconteudo #eliteboostprime",
    telegram:  "#telegram #grupotelegram #canal #eliteboostprime",
  };

  const generateFacelessScript = () => {
    const target = networks[0] ?? "instagram";
    const info = ROUTE_BY_NET[target];
    const hooks = [
      "PARA AÍ 👀 ninguém te contou esse atalho de crescimento…",
      "Se seu perfil tá travado, isso aqui é pra você 🚨",
      "Como criadores estão explodindo em 48h sem aparecer 🤯",
    ];
    const retentions = [
      `Algoritmo recompensa quem tem prova social desde o segundo 1 — por isso ${info.pitch} muda o jogo. Entrega blindada, sem queda, sem bot detectável.`,
      `O segredo: empilhar ${info.pitch} ANTES do conteúdo viralizar. O algoritmo lê isso como autoridade e empurra orgânico em cima.`,
    ];
    const ctas = [
      `🔗 Acessa ${info.url} agora, usa o cupom PRIME15 e ganha 15% imediato. Pix aprovado em 2 min.`,
      `🚀 Link na bio → ${info.url} · cupom PRIME15 · entrega começa em segundos.`,
    ];
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const s = { hook: pick(hooks), retention: pick(retentions), cta: pick(ctas) };
    setScript(s);
    setCaption(`${s.hook}\n\n${s.retention}\n\n${s.cta}\n\n${HASHTAGS[target]}`);
  };

  const aiSuggest = generateFacelessScript;

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
            <label className="text-xs uppercase tracking-wider text-muted-foreground">📝 Legenda (IA)</label>
            <button
              type="button"
              onClick={generateFacelessScript}
              className="mt-1 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-400 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(34,211,238,0.5)] border border-cyan-300/60 hover:brightness-110"
            >
              🤖 Gerar Script Faceless (Gancho · Retenção · CTA)
            </button>
            <textarea
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Clique acima para gerar com J.A.R.V.I.S. ou escreva manualmente..."
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            type="button"
            onClick={schedule}
            disabled={saving || !caption.trim() || networks.length === 0}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-black disabled:opacity-40 shadow-[0_0_28px_rgba(251,146,60,0.55)] border border-amber-300/60"
          >
            🤖 {saving ? "Agendando..." : `Agendar Conteúdo Omnichannel (${networks.length})`}
          </button>
          <button
            type="button"
            onClick={downloadCompiled}
            disabled={downloading || !bgVideo}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-400 px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-black disabled:opacity-40 shadow-[0_0_28px_rgba(34,211,238,0.55)] border border-cyan-300/60"
          >
            📥 {downloading ? `Compilando... ${downloadPct}%` : "BAIXAR MÍDIA COMPILADA"}
          </button>
          <p className="text-[10px] text-white/50">
            🔒 Modo Seguro: posts aguardam aprovação executiva via Telegram antes do envio real.
          </p>
          {err && <div className="text-xs text-red-400">{err}</div>}
        </div>

        {/* Mockup multi-format */}
        <div className="space-y-3">
          {script && (
            <div className="rounded-xl border border-amber-400/40 bg-black/60 p-3 text-[11px] space-y-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300">🎬 Roteiro Faceless · J.A.R.V.I.S.</div>
              <div><span className="text-cyan-300 font-bold">⚡ Gancho 3s:</span> <span className="text-white/90">{script.hook}</span></div>
              <div><span className="text-fuchsia-300 font-bold">🎯 Retenção:</span> <span className="text-white/90">{script.retention}</span></div>
              <div><span className="text-emerald-300 font-bold">💰 CTA:</span> <span className="text-white/90">{script.cta}</span></div>
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">🎥 Vídeo de Fundo (loop estético)</label>
            <input
              type="url"
              value={bgVideo}
              onChange={(e) => setBgVideo(e.target.value)}
              placeholder="https://...mp4"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs"
            />
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            📱 Media Mockup Viewer ({format})
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
                <img src={imageUrl} alt="overlay" className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-60" />
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
              {caption || <span className="text-white/40">Gere o roteiro Faceless para preencher legenda + hashtags…</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">🗓️ Agenda Omnichannel · Live</div>
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
