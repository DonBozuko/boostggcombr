import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Post = {
  id: string;
  post_date: string;
  image_url: string | null;
  caption_text: string;
  status: string;
};

export function JarvisContentScheduler() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 16);
  const [postDate, setPostDate] = useState(today);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("id, post_date, image_url, caption_text, status")
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
    const tags = "#eliteboostprime #crescimentoreal #instagram #tiktok #youtube";
    setCaption(`${hooks[Math.floor(Math.random() * hooks.length)]}\n\n${tags}`);
  };

  const schedule = async () => {
    setSaving(true); setErr(null);
    const { error } = await supabase.from("scheduled_posts").insert({
      post_date: new Date(postDate).toISOString(),
      image_url: imageUrl || null,
      caption_text: caption,
      status: "pending",
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setImageUrl(""); setCaption("");
    await load();
  };

  const remove = async (id: string) => {
    await supabase.from("scheduled_posts").delete().eq("id", id);
    await load();
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-card/60 p-6 space-y-5 backdrop-blur-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-extrabold tracking-tight">🤖 Central de Conteúdo J.A.R.V.I.S.</h2>
        <span className="text-[10px] uppercase tracking-wider text-cyan-300/80">
          AI Publisher Scheduler · {posts.length} agendados
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Editor */}
        <div className="space-y-3">
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
            disabled={saving || !caption.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-40 shadow-[0_0_24px_rgba(0,242,254,0.35)]"
          >
            {saving ? "Agendando..." : "✅ Aprovar e Agendar Publicação"}
          </button>
          {err && <div className="text-xs text-red-400">{err}</div>}
        </div>

        {/* Mockup Instagram */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">📱 Pré-visualização (Instagram)</div>
          <div className="rounded-xl border border-white/10 bg-black/60 overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-white/10">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-fuchsia-500 via-orange-400 to-yellow-300" />
              <div className="text-sm font-semibold">eliteboostprime</div>
            </div>
            <div className="aspect-square bg-black/80 flex items-center justify-center">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Cole uma URL para visualizar</span>
              )}
            </div>
            <div className="p-3 text-xs whitespace-pre-wrap min-h-[60px]">
              {caption || <span className="text-muted-foreground">A legenda aparecerá aqui...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Calendário / Lista */}
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">🗓️ Agenda dos Próximos Posts</div>
        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando...</div>
        ) : posts.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum post agendado.</div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs">
                <div className="w-40 tabular-nums text-cyan-300">{new Date(p.post_date).toLocaleString("pt-BR")}</div>
                <div className="flex-1 truncate">{p.caption_text.split("\n")[0]}</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                  p.status === "posted" ? "bg-emerald-500/20 text-emerald-300" :
                  p.status === "failed" ? "bg-red-500/20 text-red-300" :
                  "bg-amber-500/20 text-amber-300"
                }`}>{p.status}</span>
                <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
