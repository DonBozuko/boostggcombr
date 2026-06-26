import { useEffect } from "react";

const OFFICIAL_HOSTS = [
  "boostygram.lovable.app",
  "localhost",
  "127.0.0.1",
];
const OFFICIAL_URL = "https://boostygram.lovable.app";

export function BrandGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname;
    const allowed =
      OFFICIAL_HOSTS.includes(host) ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovable.dev") ||
      host.endsWith(".lovableproject.com");

    if (!allowed) {
      window.location.replace(OFFICIAL_URL);
      return;
    }

    const onContext = (e: MouseEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "F12") return e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "c"].includes(k))
        return e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k))
        return e.preventDefault();
    };

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
