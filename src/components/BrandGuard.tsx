import { useEffect } from "react";

const OFFICIAL_HOSTS = ["eliteboostprime.lovable.app", "localhost", "127.0.0.1"];
const OFFICIAL_URL = "https://eliteboostprime.lovable.app";

export function BrandGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const allowed =
      OFFICIAL_HOSTS.includes(host) ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovable.dev") ||
      host.endsWith(".lovableproject.com");
    if (!allowed) window.location.replace(OFFICIAL_URL);
  }, []);
  return null;
}
