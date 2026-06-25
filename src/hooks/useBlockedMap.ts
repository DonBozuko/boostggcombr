import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBlockedMap } from "@/lib/admin.functions";

export type BlockedEntry = { network: string; service_type: string };

// Hook leve: 1 fetch por mount, sem polling. Falha silenciosa → []
export function useBlockedMap() {
  const fn = useServerFn(getBlockedMap);
  const [blocked, setBlocked] = useState<BlockedEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    fn()
      .then((res) => {
        if (!cancelled && res?.ok) setBlocked(res.blocked);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [fn]);
  return blocked;
}

export function isBlocked(blocked: BlockedEntry[], network: string, service_type: string): boolean {
  return blocked.some((b) => b.network === network && b.service_type === service_type);
}
