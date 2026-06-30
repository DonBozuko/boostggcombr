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
    try {
      const s = document.createElement("script");
      s.id = "jivo-widget-script";
      s.src = `//code.jivosite.com/widget/${WIDGET_ID}`;
      s.async = true;
      document.head.appendChild(s);
    } catch {
      // fallback silencioso — botão "Fale Comigo" segue para Telegram
    }
  }, [blocked]);

  return null;
}
