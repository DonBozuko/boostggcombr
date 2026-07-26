import { useEffect } from "react";

const LAST_ACTIVITY_KEY = "eliteboost_prime_admin_last_activity";
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

export function markAdminActivity() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {}
}

export function isAdminSessionExpired(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return false;
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last > IDLE_TIMEOUT_MS;
  } catch {
    return false;
  }
}

export function clearAdminActivity() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {}
}

/**
 * Derruba a sessão do admin após 30 minutos sem interação (mouse, teclado,
 * toque, scroll ou troca de aba). Também vale entre recargas de página:
 * o carimbo de última atividade fica no localStorage.
 */
export function useIdleLogout(active: boolean, onExpire: () => void) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    markAdminActivity();
    let fired = false;

    const expire = () => {
      if (fired) return;
      fired = true;
      clearAdminActivity();
      onExpire();
    };

    const bump = () => {
      if (fired) return;
      markAdminActivity();
    };

    const check = () => {
      if (isAdminSessionExpired()) expire();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
availability_placeholder
    ];
    for (const evt of events) window.addEventListener(evt, bump, { passive: true });
    window.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 30_000);

    return () => {
      for (const evt of events) window.removeEventListener(evt, bump);
      window.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [active, onExpire]);
}
