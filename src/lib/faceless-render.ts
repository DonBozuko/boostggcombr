// v400 — Render de vídeo Faceless 100% no navegador (Canvas + MediaRecorder).
//
// Por que no navegador: o backend roda em Worker serverless, sem ffmpeg e sem
// Remotion. Render server-side seria impossível — e botão que não entrega é
// fantasma. Aqui a gravação é real: canvas animado + faixa de áudio da narração.
//
// Saída preferida: MP4 (aceito por Instagram/TikTok). Fallback: WebM.

export type FacelessFormat = "1:1" | "9:16";

export type FacelessScript = {
  hook: string;
  retention: string;
  cta: string;
};

export type FacelessOptions = {
  script: FacelessScript;
  format: FacelessFormat;
  bgVideoUrl?: string;
  audioUrl?: string; // object/data URL do MP3 da narração
  marca?: string;
  onProgress?: (pct: number, etapa: string) => void;
};

export type FacelessResult = {
  blob: Blob;
  mime: string;
  ext: "mp4" | "webm";
  durationMs: number;
};

const MIME_CANDIDATOS = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4",
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
];

/** Diz, de verdade, se este navegador consegue gravar vídeo. Sem achismo na UI. */
export function facelessVideoSupport(): { ok: boolean; mime: string; ext: "mp4" | "webm"; motivo?: string } {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { ok: false, mime: "", ext: "webm", motivo: "Este navegador não tem gravador de mídia (MediaRecorder)." };
  }
  const c = document.createElement("canvas");
  if (typeof c.captureStream !== "function") {
    return { ok: false, mime: "", ext: "webm", motivo: "Este navegador não permite capturar o canvas." };
  }
  const mime = MIME_CANDIDATOS.find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) return { ok: false, mime: "", ext: "webm", motivo: "Nenhum formato de vídeo suportado pelo navegador." };
  return { ok: true, mime, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" };
}

const quebrarLinhas = (
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMax: number,
): string[] => {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > larguraMax && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const carregarVideo = async (url: string): Promise<HTMLVideoElement | null> => {
  try {
    const v = document.createElement("video");
    v.src = url;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("timeout")), 12000);
      v.oncanplay = () => { clearTimeout(to); resolve(); };
      v.onerror = () => { clearTimeout(to); reject(new Error("erro")); };
      v.load();
    });
    await v.play().catch(() => undefined);
    return v;
  } catch {
    return null;
  }
};

/**
 * Grava o vídeo em tempo real. Duração = duração da narração (ou 12s sem áudio).
 */
export async function renderFacelessVideo(opts: FacelessOptions): Promise<FacelessResult> {
  const suporte = facelessVideoSupport();
  if (!suporte.ok) throw new Error(suporte.motivo ?? "Navegador sem suporte a gravação.");

  const progresso = opts.onProgress ?? (() => undefined);
  const W = 720;
  const H = opts.format === "9:16" ? 1280 : 720;
  const marca = opts.marca ?? "boostgg.com.br";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");

  progresso(5, "Preparando cena…");
  const bg = opts.bgVideoUrl ? await carregarVideo(opts.bgVideoUrl) : null;

  // ---- Áudio ----
  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  let duracaoMs = 12000;

  if (opts.audioUrl) {
    progresso(15, "Carregando narração…");
    audioEl = document.createElement("audio");
    audioEl.src = opts.audioUrl;
    audioEl.crossOrigin = "anonymous";
    audioEl.preload = "auto";
    await new Promise<void>((resolve) => {
      const to = setTimeout(() => resolve(), 12000);
      audioEl!.onloadedmetadata = () => { clearTimeout(to); resolve(); };
      audioEl!.onerror = () => { clearTimeout(to); resolve(); };
      audioEl!.load();
    });
    if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      duracaoMs = Math.min(Math.round(audioEl.duration * 1000) + 900, 90000);
    }
    try {
      const AC: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AC();
      await audioCtx.resume().catch(() => undefined);
      audioDest = audioCtx.createMediaStreamDestination();
      audioCtx.createMediaElementSource(audioEl).connect(audioDest);
    } catch {
      audioCtx = null;
      audioDest = null;
    }
  }

  // ---- Stream ----
  const stream = canvas.captureStream(30);
  if (audioDest) audioDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const recorder = new MediaRecorder(stream, {
    mimeType: suporte.mime,
    videoBitsPerSecond: 4_000_000,
    audioBitsPerSecond: 128_000,
  });
  const pedacos: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) pedacos.push(e.data); };

  // ---- Blocos de texto proporcionais ao tamanho ----
  const blocos = [
    { texto: opts.script.hook.trim(), cor: "#ffffff", destaque: "#22d3ee", tamanho: opts.format === "9:16" ? 66 : 54 },
    { texto: opts.script.retention.trim(), cor: "#ffffff", destaque: "#e879f9", tamanho: opts.format === "9:16" ? 46 : 40 },
    { texto: opts.script.cta.trim(), cor: "#ffffff", destaque: "#34d399", tamanho: opts.format === "9:16" ? 50 : 42 },
  ].filter((b) => b.texto.length > 0);

  const totalChars = blocos.reduce((s, b) => s + b.texto.length, 0) || 1;
  let acumulado = 0;
  const faixas = blocos.map((b) => {
    const ini = acumulado / totalChars;
    acumulado += b.texto.length;
    return { ...b, ini, fim: acumulado / totalChars };
  });

  const inicio = performance.now();
  let parar = false;

  const desenhar = () => {
    const t = performance.now() - inicio;
    const p = Math.min(t / duracaoMs, 1);

    // Fundo
    if (bg && bg.readyState >= 2) {
      const escala = Math.max(W / bg.videoWidth, H / bg.videoHeight);
      const dw = bg.videoWidth * escala;
      const dh = bg.videoHeight * escala;
      ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H);
      const desloc = (Math.sin(t / 2200) + 1) / 2;
      g.addColorStop(0, "#050b16");
      g.addColorStop(0.5 * (0.6 + desloc * 0.4), "#0b2740");
      g.addColorStop(1, "#12061c");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Escurecedor + vinheta
    ctx.fillStyle = "rgba(3,7,18,0.55)";
    ctx.fillRect(0, 0, W, H);
    const vin = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.72);
    vin.addColorStop(0, "rgba(0,0,0,0)");
    vin.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = vin;
    ctx.fillRect(0, 0, W, H);

    // Bloco atual
    const atual = faixas.find((f) => p >= f.ini && p < f.fim) ?? faixas[faixas.length - 1];
    if (atual) {
      const local = (p - atual.ini) / Math.max(atual.fim - atual.ini, 0.0001);
      const entrada = Math.min(local / 0.12, 1);
      const saida = 1 - Math.max((local - 0.9) / 0.1, 0);
      const alpha = Math.max(Math.min(entrada, saida), 0);
      const subir = (1 - entrada) * 42;
      const pulso = 1 + Math.sin(t / 620) * 0.012;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2, H / 2 + subir);
      ctx.scale(pulso, pulso);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 ${atual.tamanho}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;

      const linhas = quebrarLinhas(ctx, atual.texto.toUpperCase(), W * 0.84);
      const alturaLinha = atual.tamanho * 1.22;
      const y0 = -((linhas.length - 1) * alturaLinha) / 2;

      // Palavras já "faladas" ganham cor de destaque
      const totalPalavras = atual.texto.split(/\s+/).filter(Boolean).length || 1;
      const faladas = Math.floor(local * totalPalavras);
      let contador = 0;

      linhas.forEach((linha, i) => {
        const y = y0 + i * alturaLinha;
        const palavras = linha.split(" ");
        const larguras = palavras.map((w) => ctx.measureText(`${w} `).width);
        const largTotal = larguras.reduce((a, b) => a + b, 0) - ctx.measureText(" ").width;
        let x = -largTotal / 2;
        ctx.textAlign = "left";
        palavras.forEach((w, j) => {
          const ativa = contador <= faladas;
          ctx.shadowColor = ativa ? atual.destaque : "rgba(0,0,0,0.85)";
          ctx.shadowBlur = ativa ? 26 : 10;
          ctx.fillStyle = ativa ? atual.destaque : atual.cor;
          ctx.fillText(w, x, y);
          x += larguras[j];
          contador += 1;
        });
      });
      ctx.restore();
    }

    // Barra de progresso
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(0, H - 8, W, 8);
    const barra = ctx.createLinearGradient(0, 0, W, 0);
    barra.addColorStop(0, "#22d3ee");
    barra.addColorStop(1, "#e879f9");
    ctx.fillStyle = barra;
    ctx.fillRect(0, H - 8, W * p, 8);

    // Marca
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `800 ${opts.format === "9:16" ? 28 : 24}px system-ui, Arial, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#e2f6ff";
    ctx.fillText(marca, W / 2, H - 44);
    ctx.restore();

    progresso(20 + Math.round(p * 75), "Gravando vídeo…");
    if (!parar) requestAnimationFrame(desenhar);
  };

  recorder.start(250);
  requestAnimationFrame(desenhar);
  if (audioEl) {
    audioEl.currentTime = 0;
    await audioEl.play().catch(() => undefined);
  }

  await esperar(duracaoMs);
  parar = true;

  const blob: Blob = await new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(pedacos, { type: suporte.mime.split(";")[0] }));
    recorder.stop();
  });

  try { audioEl?.pause(); } catch { /* noop */ }
  try { await audioCtx?.close(); } catch { /* noop */ }
  try { bg?.pause(); } catch { /* noop */ }
  stream.getTracks().forEach((t) => t.stop());

  progresso(100, "Pronto");
  return { blob, mime: suporte.mime, ext: suporte.ext, durationMs: duracaoMs };
}
