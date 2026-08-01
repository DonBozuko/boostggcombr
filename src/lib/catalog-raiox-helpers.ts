// v399 — helpers puros do Raio-X do catálogo (sem servidor, sem IO).
export type MudancaTipo = "id" | "preco" | "custo" | "outro";

export function classifica(campo: string): MudancaTipo {
  const c = campo.toLowerCase();
  if (c.includes("service_id")) return "id";
  if (c.includes("price")) return "preco";
  if (c.includes("cost") || c.includes("rate")) return "custo";
  return "outro";
}
