import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getPricingTool from "./tools/get-pricing";
import consultarPedidoTool from "./tools/consultar-pedido";

// v425 — Protegendo MCP com OAuth 2.1 via Supabase Auth.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "mtrlijxhwkcqjwsxyhnr";

export default defineMcp({
  name: "boostgg",
  title: "BoostGG",
  version: "1.0.0",
  instructions:
    "Ferramentas para o BoostGG. Requer autenticação do usuário para acessar dados privados.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getPricingTool, consultarPedidoTool],
});
