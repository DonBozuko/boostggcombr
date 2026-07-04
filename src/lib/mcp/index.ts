import { defineMcp } from "@lovable.dev/mcp-js";
import getPricingTool from "./tools/get-pricing";
import consultarPedidoTool from "./tools/consultar-pedido";

export default defineMcp({
  name: "eliteboost-prime-mcp",
  title: "EliteBoost Prime",
  version: "0.1.0",
  instructions:
    "Ferramentas públicas do EliteBoost Prime: consultar preços da vitrine (get_pricing) e status de pedido por ID (consultar_pedido).",
  tools: [getPricingTool, consultarPedidoTool],
});
