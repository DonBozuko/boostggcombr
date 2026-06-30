import { useEffect } from "react";

// Widget de chat nativo (JivoSite / SmartChat equivalente).
// Configurável via VITE_JIVO_WIDGET_ID — sem id, vira no-op silencioso
// e o botão "Fale Comigo" mantém o fallback para Telegram.
const WIDGET_ID = (import.meta.env.VITE_JIVO_WIDGET_ID as string | undefined)?.trim();

declare global {
  interface Window {
    jivo_api?: { open: () => void; close?: () => void };
    openSupportChat?: () => boolean;
  }
}

export function SupportChatWidget() {
  useEffect(() => {
    window.openSupportChat = () => {
      if (window.jivo_api?.open) {
        window.jivo_api.open();
        return true;
      }
      return false;
    };
    if (!WIDGET_ID) return;
    if (document.getElementById("jivo-widget-script")) return;
    const s = document.createElement("script");
    s.id = "jivo-widget-script";
    s.src = `//code.jivosite.com/widget/${WIDGET_ID}`;
    s.async = true;
    document.head.appendChild(s);
  }, []);
  return null;
}
