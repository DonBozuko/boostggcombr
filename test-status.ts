import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function checkStatus() {
  console.log("--- AUDITORIA DE BANCO ---");
  
  // 1. Verificar se há pacotes pausados e por que
  const { data: shelf } = await supabaseAdmin
    .from("pricing_items")
    .select("slug, is_sellable, status_reason")
    .eq("is_sellable", false);
  console.log("PACOTES PAUSADOS:", shelf?.length || 0);
  if (shelf && shelf.length > 0) {
    console.log("Exemplos:", shelf.slice(0, 3));
  }

  // 2. Verificar últimos pedidos e status
  const { data: pedidos } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, created_at, valor")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("ÚLTIMOS PEDIDOS:", pedidos);

  // 3. Verificar se o J.A.R.V.I.S. está disparando alertas
  const { data: alerts } = await supabaseAdmin
    .from("alerts" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("ÚLTIMOS ALERTAS:", alerts);
}

checkStatus().catch(console.error);
