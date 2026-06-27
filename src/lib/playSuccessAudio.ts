// Jarvis post-payment success audio trigger (cache v=32)
let played = false;
export function playSuccessAudio() {
  if (played) return;
  played = true;
  try {
    const audio = new Audio("/api/public/sfx/jarvis-sucesso.mp3?v=32");
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.play().catch(() => {});
  } catch {
    /* noop */
  }
}
