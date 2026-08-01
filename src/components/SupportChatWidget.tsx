import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

// Widget de chat nativo (JivoSite / SmartChat equivalente).
// v64 — Strict Chat Routing Matrix: bloqueado em /admin (painel do Diretor).
const WIDGET_ID = (import.meta.env.VITE_JIVO_WIDGET_ID as string | undefined)?.trim();

declare global {
  interface Window {
    jivo_api?: { open: () => void; close?: () => void };
    openSupportChat?: () => boolean;
  }
}

function isBlockedPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

export function SupportChatWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const blocked = isBlockedPath(pathname);

  useEffect(() => {
    window.openSupportChat = () => {
      try {
        if (window.jivo_api?.open) {
          window.jivo_api.open();
          return true;
        }
      } catch {}
      return false;
    };
  }, []);

  useEffect(() => {
    if (blocked) {
      // Remove qualquer instância já injetada ao navegar para /admin
      try {
        document.getElementById("jivo-widget-script")?.remove();
        document.querySelectorAll('[id^="jivo-iframe-container"], jdiv, #jvlabelWrap').forEach((el) => el.remove());
        if (window.jivo_api?.close) window.jivo_api.close();
      } catch {}
      return;
    }
    if (!WIDGET_ID) return;
    if (document.getElementById("jivo-widget-script")) return;

    // v403 — o chat pesa ~360 KB (script + css + 3 sons) e era baixado antes da
    // página aparecer, atrasando a primeira tela no celular. Agora carrega
    // depois: no primeiro toque/rolagem do visitante ou 6s de ociosidade —
    // o que vier antes. O botão "Fale Comigo" continua funcionando porque o
    // clique é uma das interações que dispara o carregamento.
    let done = false;
    const inject = () => {
      if (done) return;
      done = true;
      cleanup();
      if (document.getElementById("jivo-widget-script")) return;
      try {
        const s = document.createElement("script");
        s.id = "jivo-widget-script";
        s.src = `//code.jivosite.com/widget/${WIDGET_ID}`;
        s.async = true;
        document.head.appendChild(s);
      } catch {
        // fallback silencioso — botão "Fale Comigo" segue para Telegram
      }
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "touchstart", "keydown", "scroll"];
    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, inject));
      if (timer) clearTimeout(timer);
    };
    events.forEach((e) => window.addEventListener(e, inject, { once: true, passive: true }));
    const timer = setTimeout(inject, 6000);

    return cleanup;
  }, [blocked]);


  return null;
}
