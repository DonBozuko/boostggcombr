import { createClient } from "@supabase/supabase-js";
import { analyzeCatalogCoherence, serviceKey, type CoherenceRow } from "@/lib/catalog-coherence";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const ID_COLUMNS = [
  { col: "smmhype_service_id", provider: "smmhype" },
  { col: "smmhype_auto_id", provider: "smmhype" },
  { col: "provider_service_id", provider: "smmhype" },
  { col: "smmpanel_service_id", provider: "smmpanel" },
  { col: "smmpanel_auto_id", provider: "smmpanel" },
  { col: "verified_service_id", provider: "verified" },
  { col: "verified_auto_id", provider: "verified" },
  { col: "provider4_service_id", provider: "provider4" },
  { col: "provider4_auto_id", provider: "provider4" },
];
const CACHES = [
  { table: "services_cache", provider: "smmhype" },
  { table: "smmpanel_services_cache", provider: "smmpanel" },
  { table: "verified_services_cache", provider: "verified" },
  { table: "provider4_services_cache", provider: "provider4" },
];

const { data: items } = await db.from("pricing_items" as any).select(["pacote","category","quantidade","cost_brl","price_brl","last_dry_run","is_sellable","sellable_reason",...ID_COLUMNS.map(c=>c.col)].join(", "));
const rows: CoherenceRow[] = (items as any[]).map((r) => ({
  pacote: String(r.pacote), category: r.category, quantidade: r.quantidade,
  cost_brl: r.cost_brl, price_brl: r.price_brl, last_dry_run: r.last_dry_run,
  serviceIds: ID_COLUMNS.flatMap(({col,provider}) => (r[col]==null||String(r[col]).trim()==="")?[]:[{provider,id:String(r[col]).trim()}]),
}));
const names = new Map<string,string>();
for (const { table, provider } of CACHES) {
  const { data } = await db.from(table as any).select("provider_service_id, name");
  for (const s of ((data as any[]) ?? [])) names.set(serviceKey({provider,id:String(s.provider_service_id).trim()}), String(s.name));
}
const issues = analyzeCatalogCoherence(rows, names);
const criticos = new Set(issues.filter(i => i.severity==="critical" && (i.code==="SERVICO_INCOERENTE"||i.code==="CUSTO_FORA_DA_CURVA")).map(i=>i.pacote));
const limite = new Date(Date.now()-48*3600_000).toISOString();
const religar = (items as any[]).filter(r => r.is_sellable===false && String(r.sellable_reason??"").startsWith("auditoria de coerência") && !criticos.has(r.pacote) && r.last_dry_run && r.last_dry_run > limite).map(r=>r.pacote);
console.log("criticos:", criticos.size, "religar:", religar.length, religar.join(","));
if (religar.length) {
  const { error } = await db.from("pricing_items" as any).update({ is_sellable: true, sellable_reason: null }).in("pacote", religar);
  console.log("update:", error?.message ?? "ok");
}
