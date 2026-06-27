// Jarvis post-payment success audio trigger (cache v=31)
let played = false;
export function playSuccessAudio() {
  if (played) return;
  played = true;
  try {
    const audio = new Audio("/api/public/sfx/jarvis-sucesso.mp3?v=31");
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.play().catch(() => {});
  } catch {
    /* noop */
  }
}
