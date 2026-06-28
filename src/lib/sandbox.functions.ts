import { createServerFn } from "@tanstack/react-start";

export const getSandboxEnabled = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "sandbox_mode")
      .maybeSingle();
    const enabled = !!(data?.value as { enabled?: boolean } | null)?.enabled;
    return { enabled };
  } catch {
    return { enabled: false };
  }
});
