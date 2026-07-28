// v344 — Cofre do token administrativo no navegador.
//
// Antes: o ADMIN_TOKEN (chave mestra das funções internas) ficava em
// localStorage — persistia para sempre, em qualquer aba, e qualquer script
// injetado (extensão, XSS) podia ler e usar sem senha.
//
// Agora: memória do processo + sessionStorage (morre quando a aba fecha) e
// expira sozinho em 30 min, alinhado com o logout por inatividade do painel.
// O token continua sendo reemitido pela sessão do Supabase a cada hidratação,
// então nada quebra: some daqui, o painel busca de novo.

export const ADMIN_TOKEN_KEY = "eliteboost_prime_admin_token";
const TTL_MS = 30 * 60 * 1000;

let memory: { token: string; exp: number } | null = null;

function purgeLegacy() {
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  purgeLegacy();
  const exp = Date.now() + TTL_MS;
  memory = { token, exp };
  try {
    window.sessionStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify({ token, exp }));
  } catch {
    /* memória basta */
  }
}

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  purgeLegacy();
  if (memory && memory.exp > Date.now()) return memory.token;
  try {
    const raw = window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { token?: string; exp?: number };
    if (!parsed?.token || !parsed.exp || parsed.exp <= Date.now()) {
      clearAdminToken();
      return "";
    }
    memory = { token: parsed.token, exp: parsed.exp };
    return parsed.token;
  } catch {
    return "";
  }
}

export function clearAdminToken() {
  memory = null;
  if (typeof window === "undefined") return;
  purgeLegacy();
  try {
    window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
