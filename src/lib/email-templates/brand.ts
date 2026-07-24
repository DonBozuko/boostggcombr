// Identidade visual única dos e-mails. Trocar aqui reflete em todos os templates.
// LOGO_URL precisa ser uma URL absoluta e pública (Gmail não carrega caminho relativo).
// Enquanto não houver arquivo de logo, o header usa a marca em texto.
export const LOGO_URL: string | null = null;

export const SITE_URL = "https://www.boostgg.com.br";
export const SUPORTE_EMAIL = "contato@boostgg.com.br";
export const RAZAO = "Elite Boost Prime";

export const brand = {
  main: { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" },
  container: { maxWidth: "560px", padding: "0 0 24px", margin: "0 auto" },
  headerBar: {
    backgroundColor: "#14532d",
    padding: "20px 28px",
    borderRadius: "12px 12px 0 0",
    textAlign: "center" as const,
  },
  wordmark: {
    color: "#ffffff",
    fontSize: "26px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    margin: 0,
  },
  tagline: {
    color: "#bbf7d0",
    fontSize: "12px",
    margin: "6px 0 0",
    letterSpacing: "0.4px",
  },
  body: { padding: "28px", border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 12px 12px" },
  text: { color: "#111827", fontSize: "16px", lineHeight: "24px", margin: "0 0 16px" },
  button: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    padding: "14px 28px",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 600,
    textDecoration: "none",
    display: "inline-block",
  },
  trust: {
    color: "#374151",
    fontSize: "13px",
    lineHeight: "20px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "12px 14px",
    margin: "0 0 16px",
  },
  footer: { color: "#6b7280", fontSize: "12px", lineHeight: "18px", marginTop: "24px" },
  link: { color: "#15803d", textDecoration: "underline" },
};
